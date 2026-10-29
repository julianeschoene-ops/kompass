import runpy
import unittest
from pathlib import Path
extract = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts/update-kids-news.py'))['extract']
class HeadlinesTest(unittest.TestCase):
    def test_editorial_links_only(self):
        page = '''<nav><h2><a href="/thema-100.html">Thema: Social Media und Internet</a></h2></nav>
        <main><h2><a href="/logo-vom-28-oktober-2026-100.html">Mittwoch, 28. Oktober</a></h2>
        <h2><span><a href="/sternekoch-jonas-102.html">Jonas will <b>Sternekoch</b> werden</a></span></h2>
        <h3><a href="/sternekoch-jonas-102.html">Jonas will Sternekoch werden</a></h3>
        <a href="/thema-100.html">Andere Navigation</a></main>
        <footer><h3><a href="/footer-100.html">Weitere Informationen</a></h3></footer>'''
        self.assertEqual(extract(page), [{'title': 'Jonas will Sternekoch werden', 'url': 'https://www.logo.de/sternekoch-jonas-102.html'}])
    def test_fail_on_missing_headlines(self):
        with self.assertRaises(RuntimeError): extract('<nav><a href="/thema-100.html">Thema: Navigation</a></nav>')
if __name__ == '__main__': unittest.main()
