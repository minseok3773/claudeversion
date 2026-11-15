# log-first.css를 고치면 실행: python3 tools/make-embed-css.py → log-embed.css(기존 화면 'AI 자동작성' 안에서 쓰는 한정판)
import re,os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(os.path.join(D,'log-first.css')).read()
s=s.replace(':root{\n',' .lf-embed{\n',1)
s=s.replace('*{box-sizing:border-box}\nhtml,body{margin:0}\n','.lf-embed,.lf-embed *{box-sizing:border-box}\n')
s=re.sub(r'\nbody\{background:var\(--bg\)[^\n]*','\n.lf-embed{color:var(--text);font-size:15px;line-height:1.55}',s,count=1)
s=s.replace('\nselect,input{','\n.lf-embed select,.lf-embed input{').replace('\nselect:focus,input:focus{','\n.lf-embed select:focus,.lf-embed input:focus{')
s=re.sub(r'\n body\{background:#fff;font-size:11pt\}','',s)
s=s.replace('body.lf-simple','.lf-embed.lf-simple')
bad=[l for l in s.splitlines() if re.search(r'(^|[\s,}])body\b',l)]
assert not bad,bad
open(os.path.join(D,'log-embed.css'),'w').write("/* 자동 생성(tools/make-embed-css.py) — 기존 화면 'AI 자동작성' 안의 새 자동 작성 모양. log-first.css에서 화면 전체 규칙을 빼고 .lf-embed 안으로 한정함 */\n"+s)
