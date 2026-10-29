"""Read editorial headline links in logo!'s main content, never navigation."""
import datetime
import json
import re
import urllib.request
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
from pathlib import Path


class Headlines(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_main = False
        self.heading = None
        self.link = None
        self.text = []
        self.items = []

    def handle_starttag(self, tag, attrs):
        if tag == 'main':
            self.in_main = True
        if self.in_main and tag in ('h2', 'h3'):
            self.heading = tag
        if tag == 'a' and self.in_main and self.heading:
            href = dict(attrs).get('href', '')
            # Include article/video IDs such as -102 as well as -100.
            if re.fullmatch(r'/[a-zA-Z0-9_/-]+-\d+\.html', href):
                self.link = href
                self.text = []

    def handle_data(self, value):
        if self.link:
            self.text.append(value)

    def handle_endtag(self, tag):
        if tag == 'a' and self.link:
            title = ' '.join(''.join(self.text).split())
            if 12 <= len(title) <= 180 and not title.startswith('Thema:') and not re.search(r'(?:sendung|logo-vom)-', self.link):
                self.items.append({'title': title, 'url': 'https://www.logo.de' + self.link})
            self.link = None
        if tag == self.heading:
            self.heading = None
        if tag == 'main':
            self.in_main = False


def extract(page):
    parser = Headlines()
    parser.feed(page)
    seen = set()
    items = []
    for item in parser.items:
        if item['url'] not in seen:
            items.append(item)
            seen.add(item['url'])
        if len(items) == 5:
            break
    if not items:
        raise RuntimeError('Keine logo!-Schlagzeilen gefunden; bestehende Datei bleibt erhalten')
    return items


def main():
    request = urllib.request.Request('https://www.logo.de/', headers={'User-Agent': 'Mozilla/5.0 KOMPASS school news'})
    with urllib.request.urlopen(request, timeout=25) as response:
        items = extract(response.read().decode('utf-8', 'replace'))
    today = datetime.datetime.now(ZoneInfo('Europe/Berlin')).date().isoformat()
    target = Path('daily-kids-news.json')
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps({'updated': today, 'source': 'ZDF logo!', 'items': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)


if __name__ == '__main__':
    main()
