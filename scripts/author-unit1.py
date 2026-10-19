"""Offline, reviewed conversion of the supplied archive. Never runs in a browser.
Run with Python + Pillow. Generated display content and keys live separately.
"""
from pathlib import Path
import json, re, shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'content/source/unit-1/Unit_1'
DISPLAY = ROOT / 'src/lib/learning/unit1.json'
KEYS = ROOT / 'src/lib/server/learning/unit1-keys.json'
AUDIO = ROOT / 'src/lib/server/learning/unit1-audio.json'
VERSION = '2026-10-19.3'
ASSETS = ROOT / 'static/unit1' / VERSION
URL_BASE = '/unit1/' + VERSION + '/'
ASSETS.mkdir(parents=True, exist_ok=True)
DISPLAY.parent.mkdir(parents=True, exist_ok=True)

# Coordinates are original-image pixels (left, top, right, bottom), including
# borders, headings, bubbles and their tails. The states sheet has unequal rows.
BOUNDS = {
 '02_speakers_and_groups': [(0,0,620,620),(633,0,1254,620),(0,630,620,1254),(633,630,1254,1254)],
 '01_places': [(0,0,620,620),(633,0,1254,620),(0,630,620,1254),(633,630,1254,1254)],
 '02_states_and_conditions': [(0,0,620,566),(634,0,1254,566),(0,575,620,1254),(634,575,1254,1254)],
 '01_negative_statements': [(0,0,625,604),(631,0,1254,604),(0,609,625,1254),(631,609,1254,1254)],
 '01_questions_and_answers': [(0,0,620,620),(633,0,1254,620),(0,630,620,1254),(633,630,1254,1254)],
 '01_information_questions': [(0,0,623,624),(630,0,1254,624),(0,629,623,1254),(630,629,1254,1254)],
 '01_exam_scenes': [(0,0,620,620),(633,0,1254,620),(0,630,620,1254),(633,630,1254,1254)]
}
MODELS = {
 '01_meet_the_students': ["Emma: Hi. I'm Emma. I'm a student.", "Ben: I'm Ben. I'm a student.", "Anna: I'm Anna. I'm a teacher.", "It's a phone."],
 '02_speakers_and_groups': ["Emma: I'm a student.", "Emma Benga: You're a student.", "Emma o‘zi va Ben haqida: We're classmates.", "Maya Emma va Ben haqida: They're students."],
 '01_places': ["Maya: I'm in the library.", "Ben: I'm in the classroom.", "Emma: I'm at home.", "It's on the desk."],
 '02_states_and_conditions': ["Alex: I'm tired.", "Anna: I'm busy.", "The cafe: It's open.", "The cafe: It's closed."],
 '01_negative_statements': ["Alex: I'm not at home. I'm in the library.", "Anna: I'm not a student. I'm a teacher.", "The cafe: It isn't open. It's closed.", "Emma va Ben: We aren't teachers. We're students."],
 '01_questions_and_answers': ["Ben: Are you a student? Emma: Yes, I am.", "Maya: Are you tired? Alex: Yes, I am.", "Ben: Is Anna a student? Emma: No, she isn't. She's a teacher.", "Maya: Is it an app? Ben: No, it isn't. It's a phone."],
 '01_information_questions': ["Where are you from? — I'm from Boston.", "Where are you? — I'm in the library.", "What is it? — It's a phone.", "How are you? — I'm tired."],
 '01_exam_scenes': ['Emma kutubxonada.', 'Alex auditoriyada.', 'Qahvaxona yopiq. CLOSED belgisi bor.', 'Stolda yonma-yon ikkita telefon.']
}

def derivative(im, stem):
    variants=[]
    for width in sorted(set([min(360,im.width),min(720,im.width),im.width])):
        out=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
        name=f'{stem}-{width}.webp'; out.save(ASSETS/name,quality=94,method=6)
        variants.append({'url':URL_BASE+name,'width':out.width,'height':out.height})
    return {'url':variants[-1]['url'],'width':im.width,'height':im.height,'variants':variants}

images={}
for path in sorted(SOURCE.glob('*/images/*.png')):
    number=path.parent.parent.name; stem=path.stem; ident=f'u1-l{number}-img-{stem}'
    im=Image.open(path).convert('RGB'); shutil.copyfile(path,ASSETS/f'{number}-{path.name}')
    panels=[]
    for i,box in enumerate(BOUNDS.get(stem,[])):
        label=['Yuqori chap · Alex','Yuqori o‘ng · Anna','Pastki chap · qahvaxona','Pastki o‘ng · qahvaxona'][i] if stem=='02_states_and_conditions' else 'ABCD'[i]
        panels.append({'id':ident+'-panel'+str(i+1),'label':label,'bounds':list(box),'alt':MODELS[stem][i], 'model':None if number=='1.6' else MODELS[stem][i],**derivative(im.crop(box),f'{number}-{stem}-panel{i+1}')})
    images[f'{number}/{path.name}']={'id':ident,'original':URL_BASE+f'{number}-{path.name}','alt':' '.join(MODELS[stem]),'models':[] if number=='1.6' else MODELS[stem],'panels':panels,**derivative(im,f'{number}-{stem}')}

# Explicit task-control and subpart authoring. Every parent keeps its source number.
ORDERS={(1,4):['student','am','a','I'],(2,4):['university','We','at','are'],(5,5):['Emma','from','is','Where']}
PARTS={
 (1,21):['O‘z ismingiz','Talaba ekaningiz'],
 (2,16):['Benning joylashuvi','Benning holati'],(2,21):['Hozirgi joylashuvingiz','Hozirgi holatingiz'],(2,22):['Maya qayerdan?','Maya hozir qayerda?'],
 (3,23):['Bitta tasdiq gap','Birinchi inkor gap','Ikkinchi inkor gap'],
 (4,23):['Are you a student?','Are you at home?','Are you tired?'],
 (4,24):['Universitetda ekanligi haqida savol','Qisqa javob','Tayyorligi haqida savol','Qisqa javob'],
 (5,24):["What's your name?",'Where are you from?','Where are you?','How are you?']
}
MANUAL={(1,21),(2,21),(3,23),(4,23),(4,24),(5,10),(5,24)}
# Each key is explicit; no answer key is shipped in the public lesson JSON.
ACCEPTED={
1: {1:'B',2:'I',3:'You',4:'I am a student.',5:'He',6:'She',7:'It',8:'is',9:'We',10:'They',11:'are',12:'students',13:'Ben',14:'Ben va Emma',15:"They're students.",16:["He is a student.","He's a student."],17:'Emma',18:'Anna',19:'A',20:"We're",22:["She is a teacher.","She's a teacher."],23:["They are classmates.","They're classmates."],24:["It's an app.","It is an app."]},
2: {1:["He is in the classroom.","He's in the classroom."],2:["She is at home.","She's at home."],3:'on',4:'We are at university.',5:'from',6:"Emma is from Chicago.",7:'in',8:'B',9:'tired',10:'is',11:'The cafe is open.',12:'The cafe is closed.',13:'B',14:["I am tired.","I'm tired."],15:["They are busy.","They're busy."],16:[["He is in the classroom.","He's in the classroom."],["He is tired.","He's tired."]],17:'Boston',18:'at home',19:'B',20:"It's closed.",22:[["She's from New York.","She is from New York."],["She's in the library.","She is in the library."]],23:["We are ready.","We're ready."],24:"The phone is on the desk."},
3: {1:["Anna isn't a student.","Anna is not a student.","Anna's not a student."],2:["The cafe isn't open.","The cafe is not open.","The cafe's not open."],3:["Emma and Ben aren't teachers.","Emma and Ben are not teachers."],4:['A','B'],5:"'m not",6:"Ben isn't at home.",7:'are',8:["They aren't classmates.","They're not classmates."],9:'A',10:'We are not from Boston.',11:["I'm not tired.","I am not tired."],12:["He is not a teacher.","He isn't a teacher.","He's not a teacher."],13:'Chicago',14:'C',15:'B',16:'Alex va Emma',17:'in the library',18:'A',19:'C',20:"It isn't open.",21:["You are not a teacher.","You aren't a teacher.","You're not a teacher."],22:["It is not an app.","It isn't an app.","It's not an app."],24:["They aren't tired.","They are not tired.","They're not tired."]},
4: {1:'I',2:'Yes, he is.',3:["No, she isn't.","No, she's not.","No, she is not."],4:'telefon',5:'Are you busy?',6:'Is Emma from Chicago?',7:'Is the phone on the desk?',8:'Are Maya and Ben in the library?',9:["No, it isn't.","No, it's not.","No, it is not."],10:'Yes, she is.',11:'Yes, we are.',12:["No, you aren't.","No, you're not.","No, you are not."],13:["No, she isn't.","No, she's not.","No, she is not."],14:'Yes, she is.',15:["No, she isn't.","No, she's not.","No, she is not."],16:["No, she isn't.","No, she's not.","No, she is not."],17:"No, he isn't.",18:'in the classroom',19:"No, she isn't.",20:'Yes, it is.',21:'Is she at home?',22:'Yes, I am.'},
5: {1:'Where',2:'Where',3:'What',4:'How',5:["Where is Emma from?","Where's Emma from?"],6:'Where are they?',7:["Who is she?","Who's she?"],8:["What is it?","What's it?"],9:'What',11:'B',12:'Who is she?',13:["She's from Chicago.","She is from Chicago.","Emma is from Chicago."],14:["She's in the library.","She is in the library.","Emma is in the library."],15:["She's a teacher.","She is a teacher.","Anna is a teacher."],16:["He's tired, but he's ready.","He is tired, but he is ready.","He's tired and he's ready.","He is tired and he is ready.","He's tired. He's ready.","He is tired. He is ready.","He's tired but ready.","He is tired but ready."],17:'Maya',18:'New York',19:'at home',20:'C',21:'Where are you from?',22:'What are they?',23:'Where are you?'},
6: {1:'B',2:'C',3:'A',4:'B',5:'am',6:["We are not ready.","We aren't ready.","We're not ready."],7:'Is she from Boston?',8:'Yes, she is.',9:'New York',10:'in the classroom',11:'C',12:'B',13:'Chicago',14:'at home',15:'Yes, they are.',16:"No, she isn't.",17:["I am not tired.","I'm not tired."],18:'The phone is on the desk.',19:'Where are you from?',20:'Yes, we are.'}
}
PANEL_LINKS={1:{9:(1,2),10:(1,3)},2:{1:(0,1),2:(0,2),3:(0,3),9:(1,0),10:(1,1),11:(1,2),12:(1,3)},3:{1:(0,1),2:(0,2),3:(0,3),4:(0,0)},4:{1:(0,0),2:(0,1),3:(0,2),4:(0,3)},5:{1:(0,0),2:(0,1),3:(0,2),4:(0,3)},6:{1:(0,0),2:(0,1),3:(0,2),4:(0,3)}}

lessons=[]; keys={}
for n in range(1,7):
    number=f'1.{n}'; prefix=f'u1-l{number}'; folder=SOURCE/number
    raw=(folder/'lesson.txt').read_text('utf-8-sig').strip()
    paragraphs=raw.split('\n\n'); title=paragraphs.pop(0).split('\n')[-1]
    audio=(folder/'audio_script.txt').read_text('utf-8-sig').split('\n\n')
    dialogue=next(p for p in audio if p.startswith('Hi.') or p.startswith('Maya:'))
    turns=[{'speaker':line.split(': ',1)[0] if ': ' in line else ('Emma' if n in [1,6] else 'Ben' if n==2 else 'Maya'), 'text':line.split(': ',1)[-1]} for line in dialogue.splitlines()]
    audio_id=prefix+'-audio1'
    lesson_images=[v for k,v in images.items() if k.startswith(number+'/')]
    lesson={'id':prefix,'number':number,'title':title,'version':VERSION,'kind':'exam' if n==6 else 'practice','sections':[], 'images':lesson_images,'vocabulary':[], 'audioId':audio_id}
    section=None; task_count=0; block_count=0
    answers_text=(folder/'answers.txt').read_text('utf-8-sig')
    source_answers={int(m[0]):m[1] for m in re.findall(r'^(\d+)\. (.+)$',answers_text,re.M)}
    notes=answers_text.split('QISQA IZOH\n')[-1].strip() if n<6 else answers_text.split('BALL\n')[-1].split('NATIJA')[0].strip()
    keys[prefix]={'audio':turns,'notes':notes,'tasks':{},'vocabulary':{}}
    for para in paragraphs:
        if re.match(r'^\d+\. [^\n]+$',para) and para.split('. ',1)[1].isupper():
            sn,st=para.split('. ',1); section={'id':prefix+'-s'+sn,'title':st,'items':[]}; lesson['sections'].append(section); continue
        if section is None:
            section={'id':prefix+'-intro','title':'Test haqida','items':[]}; lesson['sections'].append(section)
        if para.startswith('[RASM:'):
            stem=para.split('/')[-1].split(']')[0]; section['imageId']=images[number+'/'+stem]['id']; continue
        if para.startswith('[AUDIO:'):
            section['items'].append({'kind':'audio','id':audio_id}); continue
        match=re.match(r'^(\d+)\. (.+)',para,re.S)
        if not match:
            block_count+=1
            # File packaging is not a student instruction in the application.
            para=para.replace('Javoblar alohida faylda.','Javoblar test topshirilgandan keyin ko‘rsatiladi.')
            section['items'].append({'kind':'text','id':prefix+'-text'+str(block_count),'text':para}); continue
        qnum=int(match[1]); task_count+=1; qid=prefix+f'-q{qnum}'; text=match[2]
        options=[]
        if '\nVariantlar: ' in text:
            text,opts=text.split('\nVariantlar: ',1); options=[{'id':chr(65+i),'label':s.strip()} for i,s in enumerate(opts.split(' / '))]
        elif re.search(r'\nA\) ',text):
            text,opttext=text.split('\nA) ',1); options=[{'id':m[0],'label':m[1].strip()} for m in re.findall(r'(?:^|\n)([A-Z])\) (.+)', 'A) '+opttext)]
        control='multi' if (n,qnum)==(3,4) else 'choice' if options else 'order' if (n,qnum) in ORDERS else 'written' if (n,qnum) in MANUAL or (n,qnum) in PARTS else 'text'
        parts=[{'id':qid+'-part'+str(i+1),'label':label} for i,label in enumerate(PARTS.get((n,qnum),['Javob']))]
        task={'kind':'task','id':qid,'number':qnum,'prompt':text,'control':control,'parts':parts,'maxPoints':2 if n==6 and qnum>=17 else 1}
        if options: task['options']=options
        if (n,qnum) in ORDERS: task['tokens']=[{'id':qid+'-token'+str(i+1),'label':word} for i,word in enumerate(ORDERS[n,qnum])]
        if qnum in PANEL_LINKS.get(n,{}):
            img,panel=PANEL_LINKS[n][qnum]; task['imageId']=lesson_images[img]['id']; task['panelId']=lesson_images[img]['panels'][panel]['id']
        elif n==1 and qnum<=8: task['imageId']=lesson_images[0]['id']
        task['listening']=qnum in (range(13,17) if n==6 else range(17,21))
        section['items'].append(task)
        expected=ACCEPTED[n].get(qnum)
        if options and control=='choice':
            arr=expected if isinstance(expected,list) else [expected]
            expected=[o['id'] for o in options if o['label'] in arr or (re.search(r'\n[A-Z]\) ',para) and o['id'] in arr)]
            assert len(expected)==1,(n,qnum,options,ACCEPTED[n].get(qnum))
        elif isinstance(expected,str): expected=[expected]
        keys[prefix]['tasks'][qid]={'mode':'manual' if (n,qnum) in MANUAL else 'authored','accepted':expected or [],'feedback':source_answers[qnum], 'notes':notes, 'kind':control, 'partIds':[p['id'] for p in parts], 'rubric':qnum if n==6 and qnum>=17 else None,'listening':task['listening'], 'strict':(n,qnum) in [(1,15),(3,6),(3,8),(3,10),(5,12)]}
    assert task_count==(20 if n==6 else 24),(n,task_count)
    for line in (folder/'words.txt').read_text('utf-8-sig').splitlines()[1:]:
        if ' — ' not in line: continue
        english,uzbek=line.split(' — ',1)
        accepted=[x.strip() for x in re.split(r'[/;]',re.sub(r'\s*\([^)]*\)','',uzbek)) if x.strip()]
        vocab_id=prefix+'-v'+str(len(lesson['vocabulary'])+1)
        lesson['vocabulary'].append({'id':vocab_id,'english':english,'uzbek':uzbek})
        keys[prefix]['vocabulary'][vocab_id]=accepted
    lessons.append(lesson)
DISPLAY.write_text(json.dumps(lessons,ensure_ascii=False,indent=2)+'\n','utf-8')
KEYS.write_text(json.dumps(keys,ensure_ascii=False,indent=2)+'\n','utf-8')
audio_registry=json.loads(AUDIO.read_text('utf-8')) if AUDIO.exists() else {}
dialogues={key:value['audio'] for key,value in keys.items()}
if VERSION in audio_registry and audio_registry[VERSION]!=dialogues:
    raise ValueError('Published audio version changed; increment content version')
audio_registry[VERSION]=dialogues
# The two temporary verification revisions used exactly the same dialogue.
for legacy in ['2026-10-19.1','2026-10-19.2']:
    if legacy not in audio_registry: audio_registry[legacy]=dialogues
AUDIO.write_text(json.dumps(audio_registry,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Authored 6 lessons, 140 numbered tasks, 8 originals, 28 complete panels; keys server-only.')
