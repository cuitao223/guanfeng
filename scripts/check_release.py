"""Check tracked release contents without displaying secret values."""
from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
files=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode('utf-8').split('\0')
blocked={'.ppt','.pptx','.pdf','.doc','.docx','.xls','.xlsx','.key','.pem','.p12','.pfx','.mp4','.webm','.mp3','.wav','.zip','.jar','.class'}
forbidden={'node_modules','.tools','.venv','runtime','evidence','target','dist','.state'}
patterns=[re.compile(rb'(?:sk-(?:ant-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})'),re.compile(rb'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----')]
problems=[];checked=0
for filename in files:
 if not filename:continue
 p=ROOT/filename;checked+=1
 if not p.is_file():problems.append((filename,'missing file'));continue
 if p.suffix.lower() in blocked or any(part in forbidden for part in p.relative_to(ROOT).parts) or any(word in p.name.lower() for word in ['api key','api_key','apikey','报告','汇报','test-results','validation-report']):
  problems.append((filename,'private or generated artifact'))
 if p.stat().st_size>95*1024*1024:problems.append((filename,'oversized Git blob'))
 data=p.read_bytes()
 if any(rule.search(data) for rule in patterns):problems.append((filename,'credential-shaped content'))
print(f'Release audit: {checked} tracked files; {len(problems)} findings')
for file,reason in problems:print(f'{file}: {reason}')
sys.exit(bool(problems))
