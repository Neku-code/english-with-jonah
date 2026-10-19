# Project brief

## Purpose and audience

Create an English learning web application for the owner's university group of approximately **20 students**. The students are **university freshmen** learning English from **complete beginner level**.

Students will use both **phones and laptops**. The application must fit and work comfortably on both.

Confirmed application name: **English with Jonah**, confirmed by the user during Box 1 setup.

The user will supply the application design later. Box 1 covers technical setup and plain shared-component verification; do not begin application screen design before receiving that reference.

## Learning structure

| Unit | Topic | Release |
| --- | --- | --- |
| Unit 1 | To Be | v0.1 — current scope |
| Unit 2 | Present Simple | v0.2 — future scope |

The application will support lessons, student profiles, answers, grading, scores, and progress, with a teacher dashboard for monitoring students. Each unit will have approximately 5–7 lessons and a final exam. Finished lessons collectively earn 50 points; scoring at least 90% on the final exam grants mastery and the remaining 50 points. Below 90%, existing progress remains unchanged and the unit is not mastered yet. See [Levels and mastery](levels-and-mastery.md) for the full rules. Specific lesson content, exercise formats, and detailed grading rules still need to be defined.

## Student entry and experience

Before each lesson, students study its matching vocabulary set (for example, Vocab 1.1 or Vocab 1.2), then take a flashcard-style exam covering one-third of that set's words. They see an English word, type its Uzbek translation, and receive feedback after each answer. The vocabulary pass threshold is at least 75%. The working interpretation is that passing opens the matching lesson. See [Vocabulary](vocabulary.md) for confirmed rules and implementation assumptions.

The requested flow is:

1. A student visits the website.
2. The student enters their name.
3. The student enters their account and starts learning.

Students can get started themselves by entering their names; they do not have to wait for the teacher to add them. The teacher can also add students in advance.

The database should save student records, answers, scores, and learning progress.

## Teacher and administrator experience

The application owner is the administrator and teacher.

The requested administrator entry name is exactly:

`Jonah2009tdiu`

Under the requested flow, a person entering this value in the name field receives administrator abilities.

The administrator must be able to:

- Add new students.
- Remove students.
- Monitor students.
- View each student's progress.

## Identity and access decisions to settle during implementation

The name-only entry flow above records the user's requested behavior. It does not yet define a secure identity or session system. The administrator entry name appears in these documents and must not be treated as a protected secret.

The following details are not yet specified:

- How a returning student reliably resumes their own account.
- How students with the same name are distinguished.
- How teacher-created student records are matched to students entering their names.
- How administrator access is protected when the app holds real student data.
- Whether removing a student archives their record or permanently deletes their answers and progress.
- Additional teacher dashboard summaries beyond the lesson completion, points, exam results, and mastery measures specified in the mastery reference.

Preserve the requested simple entry experience while resolving these details with the user before a real-data launch.
