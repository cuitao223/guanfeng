"""Real-file integration tests. Temporary mutations stay below tests/data/."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import jsonschema
import netCDF4
import numpy as np
import eccodes

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
SPEC = importlib.util.spec_from_file_location('data_worker', PROJECT / 'adapters' / 'worker.py')
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)


class PublicDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = worker.dispatch({'op': 'list'})['datasets']
        cls.grib = worker.dispatch({'op': 'read', 'id': 'era5-temperature'})
        cls.satellite = worker.dispatch({'op': 'read', 'id': 'goes16-c13'})

    def cli(self, request):
        raw = request if isinstance(request, str) else json.dumps(request)
        return subprocess.run([sys.executable, '-B', str(PROJECT / 'adapters' / 'worker.py')],
                              input=raw, capture_output=True, text=True, timeout=40,
                              cwd=str(HERE))

    def test_catalog_provenance_and_hashes(self):
        self.assertEqual({x['format'] for x in self.catalog}, {'grib', 'netcdf'})
        for item in self.catalog:
            content = (worker.PUBLIC_ROOT / item['file']).read_bytes()
            self.assertLess(len(content), 4 * 1024 * 1024)
            self.assertEqual(hashlib.sha256(content).hexdigest(), item['sha256'])
            for field in ('source', 'sourceDocumentation', 'license', 'spatial', 'sourceTimeStart', 'timeStart'):
                self.assertTrue(item[field])
            self.assertFalse(item['fusionPerformed'])
        self.assertEqual(self.satellite['dataset']['timeStart'], '2024-01-01 08:00:28')
        self.assertEqual(self.grib['dataset']['timeStart'], '2017-01-01 08:00:00')

    def test_grid_contract_and_summary(self):
        for result in (self.grib, self.satellite):
            self.assertEqual(set(result), {'dataset', 'grid', 'summary'})
            grid, summary = result['grid'], result['summary']
            values = np.asarray(grid['values'])
            self.assertEqual(values.shape, (len(grid['y']), len(grid['x'])))
            self.assertTrue(np.isfinite(values).all())
            self.assertLessEqual(max(values.shape), 128)
            self.assertEqual(summary['validCount'] + summary['missingCount'], values.size)
            self.assertEqual(grid['unit'], 'K')
            self.assertAlmostEqual(summary['mean'], float(values.mean()), places=8)
            json.dumps(result, allow_nan=False)
            schema = json.loads((PROJECT / 'adapters' / 'read-response.schema.json').read_text(encoding='utf-8'))
            jsonschema.Draft202012Validator(schema).validate(result)

    def test_grib_matches_independent_eccodes_decoder(self):
        path = worker.PUBLIC_ROOT / 'era5-levels-members.grib'
        selected = None
        with path.open('rb') as stream:
            while True:
                handle = eccodes.codes_grib_new_from_file(stream)
                if handle is None:
                    break
                try:
                    if (eccodes.codes_get(handle, 'shortName') == 't'
                            and eccodes.codes_get(handle, 'level') == 850
                            and eccodes.codes_get(handle, 'number') == 0
                            and eccodes.codes_get(handle, 'dataDate') == 20170101
                            and eccodes.codes_get(handle, 'dataTime') == 0):
                        selected = eccodes.codes_get_values(handle).reshape(61, 120)
                        break
                finally:
                    eccodes.codes_release(handle)
        self.assertIsNotNone(selected)
        np.testing.assert_allclose(self.grib['grid']['values'], selected, atol=1e-6, rtol=0)
        self.assertAlmostEqual(selected[0, 0], 252.66314697265625)
        self.assertAlmostEqual(self.grib['summary']['mean'], 273.6222351407744)
        self.assertEqual(self.grib['grid']['x'][:3], [0.0, 3.0, 6.0])
        self.assertEqual(self.grib['grid']['y'][:3], [90.0, 87.0, 84.0])

    def test_netcdf_matches_raw_packing_formula(self):
        with netCDF4.Dataset(worker.PUBLIC_ROOT / 'goes16-c13-m1-20240101T000028.nc') as ds:
            variable = ds.variables['CMI']
            variable.set_auto_maskandscale(False)
            expected = variable[::4, ::4] * variable.scale_factor + variable.add_offset
            np.testing.assert_allclose(self.satellite['grid']['values'], expected, atol=1e-6, rtol=0)
            np.testing.assert_allclose(self.satellite['grid']['x'], ds.variables['x'][::4], atol=1e-9)
        self.assertEqual(self.satellite['grid']['sampling']['originalShape'], [500, 500])
        self.assertEqual(self.satellite['grid']['xUnit'], 'rad')
        self.assertEqual(self.satellite['grid']['gridMapping']['grid_mapping_name'], 'geostationary')
        self.assertAlmostEqual(self.satellite['grid']['values'][0][0], 253.57745361328125)

    def test_second_real_grib_variable(self):
        result = worker.dispatch({'op': 'read', 'id': 'era5-temperature', 'variable': 'z'})
        self.assertEqual(result['grid']['variable'], 'z')
        self.assertEqual(result['grid']['unit'], 'm**2 s**-2')
        self.assertEqual(result['summary']['validCount'], 7320)

    def test_cli_list_read_and_clean_stdout(self):
        for request in ({'op': 'list'}, {'op': 'read', 'id': 'era5-temperature'},
                        {'op': 'read', 'id': 'goes16-c13'}):
            result = self.cli(request)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(result.stderr, '')
            self.assertEqual(len(result.stdout.splitlines()), 1)
            self.assertNotIn('error', json.loads(result.stdout))

    def test_cli_errors_are_json_and_nonzero(self):
        requests = [
            {'op': 'read', 'id': 'unknown'},
            {'op': 'read', 'id': '../private.nc'},
            {'op': 'read', 'id': 'C:\\private.nc'},
            {'op': 'read', 'id': 'goes16-c13', 'path': '../private.nc'},
            {'op': 'read', 'id': 'goes16-c13', 'variable': 'DQF'},
            {'op': 'write'}, [], {'op': []}, {'op': 'read', 'id': []},
            '{broken', '', 'x' * (worker.MAX_REQUEST_BYTES + 1),
            '{"op":"list"}\n{"op":"list"}',
        ]
        for request in requests:
            with self.subTest(request=str(request)[:100]):
                result = self.cli(request)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(set(json.loads(result.stdout)), {'error'})
                self.assertEqual(result.stderr, '')

    def test_missing_masks_and_zero_preservation(self):
        values, stats = worker.encode_values(np.ma.array([[0, 12, 999, float('inf'), float('nan'), 4]],
                                                        mask=[[False, True, False, False, False, False]]))
        self.assertEqual(values, [[0, 999, 999, 999, 999, 4]])
        self.assertEqual(stats['validCount'], 2)
        self.assertEqual(stats['missingCount'], 4)
        self.assertAlmostEqual(stats['mean'], 2)
        _, empty = worker.encode_values([[np.nan, np.inf]])
        self.assertIsNone(empty['mean'])
        self.assertIsNone(empty['max'])
        self.assertEqual(empty['missingCount'], 2)
        json.dumps(empty, allow_nan=False)

    @contextlib.contextmanager
    def copied_catalog(self):
        with tempfile.TemporaryDirectory(prefix='adapter-test-', dir=HERE) as directory:
            root = Path(directory)
            for item in self.catalog:
                shutil.copy2(worker.PUBLIC_ROOT / item['file'], root / item['file'])
            shutil.copy2(worker.PUBLIC_ROOT / 'manifest.json', root / 'manifest.json')
            yield root

    def test_real_netcdf_copy_injected_fill_and_quality(self):
        # This is deliberately an injected fault in a real-file copy, not a public sample.
        with self.copied_catalog() as root:
            file = root / 'goes16-c13-m1-20240101T000028.nc'
            with netCDF4.Dataset(file, 'r+') as ds:
                cmi = ds.variables['CMI']
                cmi.set_auto_maskandscale(False)
                cmi[0, 0] = cmi._FillValue
                ds.variables['DQF'][0, 4] = 3
                ds.variables['DQF'][0, 8] = 1  # conditionally usable rejected by strict policy
            manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
            record = next(d for d in manifest['datasets'] if d['id'] == 'goes16-c13')
            record['bytes'] = file.stat().st_size
            record['sha256'] = hashlib.sha256(file.read_bytes()).hexdigest()
            (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            result = worker.dispatch({'op': 'read', 'id': 'goes16-c13'}, root)
            self.assertEqual(result['grid']['values'][0][:3], [999, 999, 999])
            self.assertEqual(result['summary']['missingCount'], 3)
            self.assertEqual(result['summary']['validCount'], 15622)
            finite = np.asarray(result['grid']['values'])
            self.assertAlmostEqual(result['summary']['mean'], float(finite[finite != 999].mean()))

    def test_manifest_traversal_rejected(self):
        with tempfile.TemporaryDirectory(prefix='adapter-test-', dir=HERE) as directory:
            root = Path(directory)
            for filename in ('../manifest.json', '..\\manifest.json', 'C:\\private.nc', '/private.nc'):
                manifest = {'datasets': [dict(x, file=filename) for x in self.catalog]}
                (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
                with self.assertRaises(worker.AdapterError):
                    worker.dispatch({'op': 'list'}, root)

    def test_tampering_and_absent_files_rejected(self):
        with self.copied_catalog() as root:
            sample = root / self.catalog[0]['file']
            with sample.open('r+b') as stream:
                stream.write(b'BAD!')
            with self.assertRaisesRegex(worker.AdapterError, 'SHA-256'):
                worker.dispatch({'op': 'read', 'id': self.catalog[0]['id']}, root)
            sample.unlink()
            with self.assertRaisesRegex(worker.AdapterError, 'absent'):
                worker.dispatch({'op': 'read', 'id': self.catalog[0]['id']}, root)

    def test_symlink_rejected_where_supported(self):
        with tempfile.TemporaryDirectory(prefix='adapter-test-', dir=HERE) as directory:
            root = Path(directory)
            target = root / 'real.nc'
            target.write_bytes(b'test only')
            link = root / 'linked.nc'
            try:
                link.symlink_to(target)
            except OSError:
                # Windows junction creation needs no symbolic-link privilege.
                if sys.platform != 'win32':
                    raise
                import _winapi
                target_dir = root / 'real-dir'
                target_dir.mkdir()
                linked_dir = root / 'linked-dir'
                _winapi.CreateJunction(str(target_dir), str(linked_dir))
                try:
                    with self.assertRaises(worker.AdapterError):
                        worker._catalog(linked_dir)
                finally:
                    linked_dir.rmdir()
                return
            with self.assertRaises(worker.AdapterError):
                worker._public_path(link.name, root)


if __name__ == '__main__':
    unittest.main(verbosity=2)
