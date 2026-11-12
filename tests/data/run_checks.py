"""Run actual decoder/CLI/schema checks; save a portable UTF-8 report here."""
from datetime import datetime, timezone
import importlib.metadata
import io
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import test_worker


def main():
    stream = io.StringIO()
    suite = unittest.defaultTestLoader.discover(str(HERE), pattern='test_*.py')
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    text = stream.getvalue()
    (HERE / 'test-results.txt').write_text(text, encoding='utf-8')
    details = []
    if result.wasSuccessful():
        for identifier in ('era5-temperature', 'goes16-c13'):
            value = test_worker.worker.dispatch({'op': 'read', 'id': identifier})
            schema = json.loads((test_worker.PROJECT / 'adapters' / 'read-response.schema.json').read_text(encoding='utf-8'))
            test_worker.jsonschema.Draft202012Validator(schema).validate(value)
            details.append({'id': identifier, 'sha256': value['dataset']['sha256'],
                            'shape': value['grid']['sampling']['returnedShape'],
                            'unit': value['grid']['unit'], 'summary': value['summary'],
                            'jsonSchemaValid': True})
    report = {'testedAtUTC': datetime.now(timezone.utc).isoformat(),
              'python': sys.version.split()[0],
              'dependencies': {name: importlib.metadata.version(name) for name in
                               ('numpy', 'xarray', 'netCDF4', 'cfgrib', 'eccodes', 'jsonschema')},
              'testsRun': result.testsRun, 'failures': len(result.failures),
              'errors': len(result.errors), 'skipped': len(result.skipped),
              'successful': result.wasSuccessful(), 'datasets': details,
              'scope': 'Python adapter real-file decoding, CLI, JSON schema, injected missing data, path and integrity refusal; Java integration is outside this report.'}
    (HERE / 'validation-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=True))
    if not result.wasSuccessful():
        print(text, file=sys.stderr)
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
