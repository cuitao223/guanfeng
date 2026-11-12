"""Isolated build inputs and read-only live HTTP checks; no model requests."""
import argparse
import importlib.util
import json
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def snapshot(destination):
    destination = Path(destination).resolve()
    allowed = (ROOT / 'scripts' / '.state').resolve()
    if destination == allowed or not destination.is_relative_to(allowed) or destination.exists():
        raise ValueError('Snapshot must be a new directory below scripts/.state')
    destination.mkdir(parents=True)
    excluded = shutil.ignore_patterns('node_modules', 'target', 'dist', '__pycache__', '.git', '.chrome-profile',
                                     '.tools', '.venv', '.state', 'runtime', 'evidence', '*.log', '*.key')
    for folder in ('backend', 'frontend', '.harness', 'adapters', 'tests/data', 'data/public'):
        shutil.copytree(ROOT / folder, destination / folder, ignore=excluded)
    # Maven reactor uses the current component source without installing into ~/.m2.
    (destination / 'pom.xml').write_text("""<project xmlns="http://maven.apache.org/POM/4.0.0">
<modelVersion>4.0.0</modelVersion><groupId>local.guanfeng</groupId>
<artifactId>verification</artifactId><version>1</version><packaging>pom</packaging>
<modules><module>.harness/backend/code/leice-radar-series-service</module><module>backend</module></modules>
</project>
""", encoding='utf-8')
    print(json.dumps({'snapshot': str(destination), 'sourceModified': False}))


def http_checks(backend, frontend, output):
    for address in (backend, frontend):
        from urllib.parse import urlparse
        parsed = urlparse(address)
        if parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or parsed.username or parsed.password:
            raise ValueError('Only credential-free HTTP loopback URLs are accepted')
    spec = importlib.util.spec_from_file_location('core_http_checks', ROOT / 'tests/integration/verify_core.py')
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    reporter = module.Reporter(backend)
    checks = []

    def run(name, operation):
        try:
            operation()
            checks.append({'name': name, 'exitCode': 0})
        except Exception as error:
            # Do not persist server response bodies or environment variables.
            checks.append({'name': name, 'exitCode': 1, 'errorType': type(error).__name__})

    def health():
        module.check_health(reporter)

    datasets = []
    def catalog():
        _, payload, _ = reporter.request('GET', '/api/wb/datasets', expected={200})
        datasets.extend(reporter.data(payload))
        if not datasets:
            raise AssertionError('Empty dataset catalog')

    def read_format(kind):
        candidates = [item for item in datasets if item.get('format') == kind]
        if not candidates:
            raise AssertionError('Missing format')
        _, payload, _ = reporter.request('GET', '/api/wb/datasets/' + candidates[0]['id'], expected={200})
        module.Reporter.data(payload)

    def analysis():
        dbs, csv_path = module.choose_dbs_dataset(datasets)
        module.check_radar_analysis(reporter, dbs, csv_path)

    def html():
        with urllib.request.urlopen(frontend.rstrip('/') + '/workbench', timeout=15) as response:
            content = response.read(2 * 1024 * 1024).lower()
            if response.status != 200 or b'<html' not in content:
                raise AssertionError('Workbench HTML unavailable')

    def proxy():
        with urllib.request.urlopen(frontend.rstrip('/') + '/api/wb/health', timeout=10) as response:
            payload = json.load(response)
            if payload.get('code') != 200 or payload.get('data', {}).get('status') != 'ok':
                raise AssertionError('Frontend API proxy unhealthy')

    run('backend-health', health)
    run('dataset-catalog', catalog)
    for kind in ('radar-dbs', 'radar-ppi', 'grib', 'netcdf'):
        run('read-' + kind, lambda kind=kind: read_format(kind))
    run('DBS-independent-calculation-and-invalid-range', analysis)
    run('frontend-html', html)
    run('frontend-api-proxy', proxy)
    result = {'checks': checks, 'http': reporter.http,
              'passed': all(item['exitCode'] == 0 for item in checks),
              'scope': 'Live read/analysis only: no workflow runs, plugin/project/session changes, deployments or model API calls.'}
    Path(output).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': result['passed'], 'checks': checks}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    subs = parser.add_subparsers(dest='action', required=True)
    copy = subs.add_parser('snapshot')
    copy.add_argument('destination')
    http = subs.add_parser('http')
    http.add_argument('--backend', required=True)
    http.add_argument('--frontend', required=True)
    http.add_argument('--output', required=True)
    args = parser.parse_args()
    if args.action == 'snapshot':
        snapshot(args.destination)
    else:
        raise SystemExit(http_checks(args.backend, args.frontend, args.output))
