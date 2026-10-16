#!/usr/bin/env python3
"""Independent 21 Grade IX/X English essay exemplar research; NEVER answer-key approval.

The prose is new writing and deliberately not copied from textbook/past papers.
An exemplar illustrates ONE reasonable answer, not the unique correct answer.
"""
from __future__ import annotations
import hashlib, importlib.util, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=ROOT/'docs/question-bank/ASSPS_GRADE910_ENGLISH_21_INDEPENDENT_UNAPPROVED_ESSAY_EXEMPLARS_20261016.json'
FROZEN={
 '9th':('english9Starter2026.json','af6619575af1ccd0bcad45997da63369b8d9768865d34b80cebf2a2e6ca0941f','pectaa-catalog-004'),
 '10th':('english10Starter2026.json','eb8b356c4b3dd797451b245cbdd732a2d1dee2e9e1fe5135708fef1fca6d054c','pectaa-catalog-016')
}
ESSAYS={
('9th',1):"""A fair society depends on honesty, trust, and self-discipline. When people tell the truth, others can rely on their words and decisions. Justice requires us to listen carefully before judging anyone and to apply rules fairly, even when doing so is difficult. Self-discipline helps us resist the temptation to take an easy but dishonest path. For example, a student who prepares for an examination instead of cheating protects both personal dignity and the trust of teachers. Good character is built through small choices repeated every day. By treating everyone respectfully and accepting responsibility for our actions, we can make school and society safer and more just.""",
('9th',2):"""Patriotism is more than praising a country's achievements. It is a continuing responsibility to help neighbours, respect public property, and obey fair laws. A responsible citizen learns about the nation's history while remaining willing to correct problems peacefully. Students can contribute by keeping shared places clean, supporting classmates, and using resources carefully. Respect for different languages and communities also strengthens unity because no one should feel excluded from the country's future. When people work with honesty and dedication, their actions turn affection for their homeland into useful service. True national pride grows when citizens make life better for everyone around them.""",
('9th',3):"""Nature often inspires wonder because its ordinary details can reveal extraordinary beauty. A quiet morning may begin with sunlight touching the leaves while birds call from distant trees. The changing colours of a garden remind us that every season has its own character. Poetry can capture these observations through images, rhythm, and carefully chosen words. Instead of merely stating that rain is beautiful, a writer might describe drops tracing silver lines across a window. Such expression encourages readers to notice feelings as well as facts. Observing nature patiently can develop imagination, gratitude, and a stronger wish to protect the world we share.""",
('9th',4):"""Trust and respect are essential to friendship, but they also require courage and self-discipline. A trustworthy person keeps reasonable promises and admits a mistake rather than blaming someone else. Courage does not always mean facing physical danger; sometimes it means speaking politely when a friend is treated unfairly. Self-discipline helps us control anger and choose thoughtful words during disagreement. Respect involves listening without mocking another person's opinion. These qualities support each other: honesty builds confidence, while patience protects relationships when problems arise. In the classroom and at home, small acts of fairness and kindness gradually create a community where everyone feels valued.""",
('9th',5):"""Entrepreneurship begins when someone notices a problem and tries to create a useful solution. A new venture may provide a service, introduce a creative product, or make an existing task easier. Equal opportunities for women are important because talent and determination are not limited by gender. Access to education, fair financing, mentoring, and safe workplaces allows more people to develop their ideas. For example, a woman with strong design skills might start a small business while continuing her studies. Responsible entrepreneurs consider customer needs, honest pricing, and community benefits. When society supports diverse business owners, it gains fresh ideas, employment, and greater economic resilience.""",
('9th',6):"""Time is a valuable resource because an hour that has passed cannot be recovered. Managing time does not mean staying busy every moment; it means deciding which responsibilities deserve attention first. A student may plan revision, household tasks, exercise, and rest in a realistic daily schedule. Large assignments become easier when divided into smaller steps with clear deadlines. Short breaks help maintain concentration, while leaving room for unexpected problems prevents unnecessary stress. It is also wise to limit distractions during focused work. Good time management develops reliability and allows people to enjoy meaningful activities without forgetting their duties. The aim is balance rather than perfection.""",
('9th',7):"""Bravery often appears when someone chooses hope and responsibility despite fear. A person who faces disappointment, learns from it, and tries again demonstrates resilience. These qualities can also be expressed through poetry. A poet may use the image of a tree standing through a storm to suggest determination, even when the speaker feels uncertain. Rhythm, contrast, and vivid language can make a message memorable without directly explaining every emotion. Yet genuine courage should be guided by wisdom, not a desire to impress others. In ordinary life, asking for help, defending fairness, and recovering from mistakes can all be brave acts.""",
('9th',8):"""Globalisation connects people through trade, communication, travel, and shared knowledge. A small business can now learn about customers far away, while students can exchange ideas across borders. These connections may create jobs and encourage understanding of different cultures. However, local languages, traditional crafts, and smaller producers may face pressure when powerful global trends dominate markets. Economic benefits are not always shared equally. Communities can respond by improving education, supporting fair opportunities, and preserving valuable cultural practices. Understanding globalisation requires both openness and thoughtful criticism. We can welcome useful innovations without assuming that every foreign trend is automatically better than local knowledge.""",
('9th',9):"""Quality education is essential for sustainable development because it helps people make informed decisions about health, livelihoods, and the environment. Learning should encourage curiosity, problem-solving, and respect rather than relying only on memorisation. When students understand the effects of pollution or waste, they can suggest practical improvements in their communities. Education also creates opportunities for girls and boys to develop skills and participate fairly in society. Schools can model responsibility by conserving materials, promoting cooperation, and listening to student ideas. Sustainable progress depends on decisions made over many years. Well-supported teachers and inclusive learning environments help prepare citizens for that shared responsibility.""",
('9th',10):"""Wildlife is part of an interconnected natural world in which plants and animals depend on one another. Pollinators support many flowering plants, while predators can help maintain balance among animal populations. Forests, wetlands, and other habitats also provide people with water, clean air, and valuable resources. When habitats are destroyed or polluted, the effects may spread through whole food webs. Conservation therefore requires protecting habitats, using natural resources responsibly, and reducing unnecessary waste. Students can learn about local species and encourage respect for shared green spaces. Protecting wildlife is not only an act of kindness; it also supports healthy ecosystems and future generations.""",
('9th',11):"""Human relationships are shaped by choices, communication, and the values people practise. In a drama, a character may face a conflict between loyalty to a friend and the duty to tell the truth. The audience learns about the character through dialogue and decisions, not just through descriptions. Misunderstandings can create tension, while listening and honesty may lead to reconciliation. Real relationships are similar because people sometimes act without knowing another person's feelings. Patience, respect, and willingness to apologise can prevent small disagreements from becoming serious conflicts. Drama reminds us that character is revealed most clearly when a person must make a difficult but thoughtful choice.""",
('10th',1):"""Ethics and dignity guide the way we treat other people, especially when nobody is watching. A responsible person recognises that every individual deserves respect and fair treatment. Ethical choices include speaking truthfully, protecting another person's privacy, and refusing to gain advantage through deception. Social responsibility means noticing how our actions affect others. For instance, sharing reliable information instead of spreading a hurtful rumour can prevent unnecessary harm. Communities become stronger when citizens help those in need and accept the consequences of their decisions. Dignity is not earned through wealth or status; it is respected through our conduct and through the care we show others.""",
('10th',2):"""National pride is meaningful when it encourages service rather than hostility toward others. We can honour our country's achievements by learning its history and respecting the people who contributed to its progress. Patriotism also asks us to recognise present challenges honestly. Students can contribute through careful study, community service, protection of public property, and respect for the rights of fellow citizens. Appreciation of different cultures and languages makes national unity more inclusive. Pride should inspire responsibility, not the belief that other nations have nothing valuable to teach us. A country benefits most when its people combine affection for their homeland with integrity, cooperation, and a willingness to improve.""",
('10th',3):"""Digital communication has changed how people learn, cooperate, and express themselves. Messages can travel quickly, and video calls connect relatives or classmates across long distances. New abbreviations, symbols, and borrowed words also appear as people adapt language to online conversations. This flexibility can encourage creativity, but it may cause confusion when informal expressions are used in formal writing. Students should therefore choose language according to purpose and audience. They should also verify information before forwarding it and respect the privacy of other users. Technology shapes the way we communicate, yet thoughtful listening, accuracy, and kindness remain important in every medium.""",
('10th',4):"""Climate action begins with understanding that human activities can affect the atmosphere and the natural systems on which communities depend. Reducing unnecessary energy use, limiting waste, and protecting green spaces are examples of useful local choices. Governments and businesses also have responsibilities, including investment in cleaner systems and careful planning for extreme weather. Sustainability means meeting present needs without carelessly reducing future generations' opportunities. No single action will solve a global problem, and solutions must consider fairness and local circumstances. By combining scientific knowledge, cooperation, and realistic long-term decisions, communities can reduce avoidable harm and become better prepared for environmental challenges.""",
('10th',5):"""Compassion means recognising another person's difficulties and responding with respect instead of quick judgement. Character becomes visible when someone chooses kindness without expecting a reward. A story may present two people who interpret the same event differently because their experiences are not identical. Looking at the situation from both perspectives can reveal hidden worries or misunderstandings. This does not require agreeing with every action; it requires listening before reaching a conclusion. In school, students show compassion by including isolated classmates and offering practical support when appropriate. A thoughtful perspective helps people resolve conflict and reminds them that dignity belongs to everyone, not only to those they know well.""",
('10th',6):"""Good health is supported by informed choices and access to reliable care. Everyday habits such as sufficient sleep, nutritious meals, hand hygiene, and regular physical activity can contribute to wellbeing. Preventive healthcare also includes recommended vaccinations, safe environments, and seeking professional advice when symptoms need attention. People should be cautious about rumours that promise effortless cures or discourage medical treatment without evidence. Health choices affect families and communities, so protecting others can matter as much as personal comfort. Not every illness can be prevented, and people deserve care without blame. Responsible decisions combine reliable information, compassion, and timely help from qualified healthcare professionals.""",
('10th',7):"""Managing priorities helps us use limited time on the activities that matter most. Urgent tasks should not automatically replace important long-term goals, such as learning a skill or maintaining good relationships. A realistic plan starts with listing responsibilities and setting clear, manageable targets. Difficult work can be divided into smaller stages, while breaks and rest should remain part of the schedule. Reviewing progress each evening helps identify what needs adjustment. Unexpected events will sometimes interrupt even a careful plan, so flexibility is necessary. Good time management is not a competition to do more than everyone else; it is a way to work responsibly while maintaining balance.""",
('10th',8):"""Environmental care becomes more effective when people act together as citizens. A neighbourhood may face litter, blocked drains, disappearing trees, or unnecessary use of water. Residents can begin by learning the causes of these problems and discussing realistic improvements with local authorities. Organised clean-up activities, recycling where suitable, and respectful reporting of hazards can make public spaces healthier. Schools can teach students to protect shared facilities and understand why pollution matters. Civic action should be peaceful, inclusive, and based on evidence. Small improvements may not solve every environmental challenge, but cooperation can encourage stronger policies and lasting responsibility for common resources.""",
('10th',9):"""Every important choice carries both opportunities and possible consequences. When making a decision, we should gather reliable information, consider how others may be affected, and compare realistic options. A student choosing an extracurricular activity, for example, might consider personal interests, available time, and existing responsibilities. Reflection is valuable because even a disappointing result can reveal what should be changed next time. It helps to distinguish a genuine mistake from a situation that was uncertain despite careful planning. Listening to constructive feedback does not mean giving up independent judgement. Thoughtful choices grow from patience, honest self-assessment, and a willingness to learn from experience.""",
('10th',10):"""Wisdom is more than knowing many facts; it involves applying knowledge with care and good judgement. Before acting, a thoughtful person considers the evidence, the needs of others, and the likely consequences. Quick decisions may sometimes be necessary, but difficult situations often benefit from asking questions and listening to different perspectives. A wise student who notices a classmate struggling may offer help respectfully rather than embarrassing them in front of others. Thoughtful action also requires admitting uncertainty and changing one's opinion when stronger evidence appears. By combining knowledge with humility, responsibility, and compassion, we can make decisions that are useful as well as fair."""
}
def sha(b):return hashlib.sha256(b).hexdigest()
def build(current,hashes,review):
 if len(ESSAYS)!=21 or len({(grade,ch) for grade,ch in ESSAYS})!=21:raise ValueError('ENGLISH_EXEMPLAR_21_SCOPE_DRIFT')
 out=[]
 for (grade,chapter),prose in sorted(ESSAYS.items()):
  id=f'{"IX-ENG-2025" if grade=="9th" else "X-ENG-2026"}-U{chapter:02d}-E01'
  r=current[id];rv=review[id];name,source_sha,catalog=FROZEN[grade]
  if (r.get('grade')!=grade or r.get('subject')!='English'
      or r.get('medium')!='english' or r.get('type')!='essay'
      or r.get('marks')!=5 or str(r.get('chapter'))!=str(chapter)
      or rv.get('priority')!='HIGH' or rv.get('currentLiveContentRevisionSha256')!=hashes[id]):
   raise ValueError('ENGLISH_EXEMPLAR_NOT_CURRENT_HIGH_ESSAY')
  if not 75<=len(prose.split())<=145 or not prose.endswith('.'):
   raise ValueError('ENGLISH_EXEMPLAR_QUALITY_LENGTH_UNSUITABLE')
  rubric=[
   'Relevant and coherent topic sentence (1 mark)',
   'Two or more accurate and specific supporting ideas (1 mark)',
   'Logical development and effective linking of ideas (1 mark)',
   'Readable grammar, vocabulary and sentence structure (1 mark)',
   'Appropriate concluding sentence and clear paragraph organisation (1 mark)'
  ]
  out.append({'questionId':id,'grade':grade,'subject':'English','medium':'english',
   'type':'essay','marks':5,'storedResearchUnitNotVerifiedEdition':chapter,
   'frozenOriginalAuthoredResearchFile':name,'originalFrozenFileSha256':source_sha,
   'sourceCatalogCandidateNotSchoolAdoptionProof':catalog,
   'currentLiveFullQuestionRevisionSha256':hashes[id],
   'originalIllustrativeParagraphNotUniqueAnswer':prose,
   'flexibleFiveCriterionMarkingGuide':rubric,
   'alternateCorrectStudentAnswersPermitted':True,
   'thisIsAnIllustrativeExemplarNotAnAnswerKey':True,
   'textbookExtractOrPastPaperTextReproduced':False,
   'authenticASSPSAdoptedEditionEvidence':False,
   'independentEnglishTeacherReviewed':False,
   'sourceExercisePrintedPageVerified':False,
   'academicApproved':False,'published':False,'paperStudioVerifiedSelectable':False,
   'status':'ILLUSTRATIVE_DRAFT_NOT_SINGLE_CORRECT_ANSWER_AWAIT_TEACHER'})
 return {'schema':'ASSPS_GRADE910_21_ENGLISH_ESSAY_EXEMPLAR_UNAPPROVED_RESEARCH_V1',
  'totalCandidateResearchExemplars':21,'grade9Exemplars':11,'grade10Exemplars':10,
  'answersAreExamplesNotTheOnlyValidAnswers':True,
  'frozenOriginalResearchFilesShaVerified':2,
  'currentRevisionPinsPresent':True,'productionDatabaseWrites':0,
  'schoolAdoptedEditionConfirmed':False,'exercisePageProvenanceConfirmed':False,
  'qualifiedEnglishTeacherReviewCompleted':False,
  'academicApproved':False,'published':False,'paperStudioSelectable':False,'rows':out}
def read():
 sp=importlib.util.spec_from_file_location('assps_essay_readonly',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
 real=m.read_live();d={r['id']:r for r in real}
 ledger=json.loads((STATE/'live-question-revisions.json').read_text())
 hashes={r['questionId']:r['revisionSha256'] for r in ledger['records']}
 risk=json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())
 pri={z['questionId']:z for z in risk['records']}
 if len(real)!=2411 or len(hashes)!=2411 or len(pri)!=604:raise ValueError('ENGLISH_LIVE_CORPUS_SCOPE_DRIFT')
 for grade,(fn,source_sha,catalog) in FROZEN.items():
  b=(DATA/fn).read_bytes()
  if sha(b)!=source_sha:raise ValueError('ENGLISH_ORIGINAL_FILE_HASH_DRIFT')
  originals=json.loads(b)
  o={x['id']:x for x in originals['drafts']}
  for (g,ch) in ESSAYS:
   if g!=grade:continue
   id=f'{"IX-ENG-2025" if g=="9th" else "X-ENG-2026"}-U{ch:02d}-E01'
   x=o[id]
   if (m.revision_sha(d[id])!=hashes[id]
       or x['type']!='essay' or x['marks']!=5
       or x['content']['en']['stem']!=d[id]['questionText']
       or x['content']['en']['answer']!=d[id]['answer']):
    raise ValueError('ENGLISH_ORIGINAL_STEM_ANSWER_OR_LIVE_REVISION_CHANGED')
 return d,hashes,pri
def main():
 x=build(*read())
 raw=json.dumps(x,indent=2,sort_keys=True,ensure_ascii=False)+'\n'
 if len(sys.argv)==2 and sys.argv[1]=='--check':
  if not OUT.exists() or OUT.read_text()!=raw:raise ValueError('ENGLISH_ESSAY_RESEARCH_PACKET_TAMPERED')
  print('21_ORIGINAL_ENGLISH_ESSAY_EXEMPLARS_FROZEN_SHA_LIVE_SHA_MATCH_NO_APPROVAL')
 elif len(sys.argv)==1:
  OUT.write_text(raw,encoding='utf8');print('21_ORIGINAL_ENGLISH_ESSAY_EXEMPLAR_CANDIDATES_CREATED')
 else:raise ValueError('NO_ARGS_OR_CHECK_ONLY')
if __name__=='__main__':main()
