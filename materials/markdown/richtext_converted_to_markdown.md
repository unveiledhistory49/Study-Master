StudyMaster - Project Build Specification (Version 1.0)

Project Vision

StudyMaster is a private AI-powered learning platform built for mastery rather than content consumption.

The goal is not to replace teachers or create another online course platform.

The goal is to create an adaptive learning engine that continuously determines what a student knows, what they don't know, why they don't know it, and what they should learn next.

Initially the platform is built for only two users.

\- User 1: Preparing for UTME Medicine & Surgery (Target: 320+)

\- User 2: Preparing for university with emphasis on deep understanding rather than exam performance.

Because only two users exist, the platform should optimize for educational quality rather than scalability.

\---

Primary Philosophy

Traditional education works like this:

Read chapter

↓

Take notes

↓

Write test

↓

Move on

StudyMaster works like this:

Learn Concept

↓

Practice

↓

Analyze Mistakes

↓

Fill Knowledge Gaps

↓

Practice Again

↓

Achieve Mastery

↓

Move Forward

Students never progress simply because they completed a lesson.

They progress because they demonstrate mastery.

\---

Core Principles

The AI never teaches blindly.

The AI always knows:

• What the student already understands

• What concepts are weak

• Which misconceptions exist

• Which prerequisite knowledge is missing

• What should be studied next

Every AI interaction should improve this understanding.

\---

Technology Stack

Frontend

\- Next.js

\- React

\- TypeScript

\- TailwindCSS

\- shadcn/ui

Backend

\- FastAPI (Python)

Database

\- PostgreSQL

Authentication

\- Better Auth

AI

\- NVIDIA NIM API

\- DeepSeek-V4-Pro

\- DeepSeek-V4-Flash

Storage

\- Local storage during development

\- Object storage later if needed

PDF Processing

\- OCR pipeline

\- Text extraction

\- Chunking

\- Metadata generation

Version Control

\- Git

\- GitHub

Deployment

\- Vercel (Frontend)

\- Railway / Render / VPS (Backend)

\---

AI Responsibilities

DeepSeek Pro

\- Lesson generation

\- Question generation

\- Socratic tutoring

\- Exam generation

\- Misconception analysis

\- Study planning

\- Knowledge graph construction

DeepSeek Flash

\- General chat

\- Daily summaries

\- Progress reports

\- Quick explanations

\- UI assistance

\---

High-Level Architecture

PDFs

↓

OCR

↓

Clean Text

↓

Knowledge Extraction

↓

Knowledge Graph

↓

Lesson Generator

↓

Student

↓

Assessment

↓

Mistake Analysis

↓

Mastery Engine

↓

Next Recommendation

\---

Core Modules

1\. Authentication

Simple login.

Only two accounts.

No public registration.

\---

2\. Subject Manager

Subjects:

Biology

Chemistry

Physics

Later:

English

Mathematics

University courses

\---

3\. Knowledge Graph

This is the heart of the platform.

Every subject becomes:

Subject

↓

Topic

↓

Concept

↓

Subconcept

↓

Learning Objectives

Each concept stores:

Unique ID

Prerequisites

Difficulty

Estimated learning time

Estimated retention

Importance

UTME weight

Mastery threshold

\---

4\. Lesson Engine

Input

Concept ID

Output

AI-generated lesson.

Each lesson contains:

Learning objectives

Core explanation

Examples

Visual suggestions

Common misconceptions

Summary

Key facts

Memory aids

Transition to practice

Lessons should encourage understanding rather than memorization.

\---

5\. Practice Engine

Questions generated dynamically.

Question types:

MCQ

Short answer

Fill in blanks

Definition

Diagram labeling

Calculation

Reasoning

Application

No static question bank.

Questions generated from prompts.

\---

6\. Mistake Analyzer

Every incorrect answer is classified.

Possible causes:

Knowledge gap

Misread question

Careless mistake

Calculation error

Confused definitions

Weak reasoning

Guessing

Low confidence

Student profile updates after every mistake.

\---

7\. Socratic Tutor

The tutor rarely gives direct answers.

Instead:

Ask guiding questions

Lead student

Discover misconception

Correct misconception

Confirm understanding

\---

8\. Mastery Engine

Every concept has:

Mastery Score

Confidence

Retention

Time spent

Attempts

Success rate

A concept is complete only after mastery threshold is achieved.

\---

9\. Spaced Repetition

Each concept predicts forgetting.

Review schedule updates automatically.

Review frequency depends on:

Difficulty

Confidence

Past performance

Time elapsed

\---

10\. Exam Simulator

Generate complete UTME-style exams.

Configurable:

Questions

Difficulty

Time

Subject distribution

After submission:

Detailed analysis

Weak areas

Strong areas

Projected score

Recommended next topics

\---

11\. Progress Dashboard

Display:

Current streak

Study time

Mastery %

Retention %

Weak concepts

Strong concepts

Upcoming reviews

Predicted UTME score

Subject breakdown

Daily goal

Weekly goal

\---

12\. Student Memory

Every interaction stored.

Question history

Concept history

Lesson history

Weaknesses

Confidence

Review history

Misconceptions

Time spent

Improvement trend

\---

AI Prompt Library

Separate prompts for:

Lesson Generator

Quiz Generator

MCQ Generator

Exam Generator

Hint Generator

Socratic Tutor

Mistake Analyzer

Study Planner

Progress Reporter

Knowledge Graph Builder

Concept Summarizer

Review Generator

\---

Material Pipeline

Phase 1

Collect

Textbooks

Notes

Teacher handouts

WAEC materials

UTME syllabus

Past questions

Diagrams

Laboratory manuals

Practical guides

\---

Phase 2

OCR

Convert scans into text.

\---

Phase 3

Cleaning

Remove headers

Remove page numbers

Remove duplicates

Fix OCR mistakes

Normalize formatting

\---

Phase 4

Knowledge Extraction

AI identifies:

Subjects

Topics

Concepts

Definitions

Equations

Formulae

Examples

Relationships

Prerequisites

Learning objectives

\---

Phase 5

Knowledge Graph Construction

Store every concept with links to:

Prerequisites

Children

Examples

Diagrams

Practice prompts

Revision prompts

\---

Student Workflow

Choose subject

↓

Choose recommendation

↓

Read lesson

↓

Answer questions

↓

Receive explanation

↓

Mistakes analyzed

↓

Additional questions generated

↓

Mastery updated

↓

Next concept recommended

\---

Database Entities

Users

Subjects

Topics

Concepts

Lessons

Questions

Attempts

Mastery

Reviews

Study Sessions

Exams

Exam Results

Mistakes

Knowledge Graph

Student Profiles

Prompt Templates

\---

UI Pages

Login

Dashboard

Subjects

Topics

Lesson

Quiz

Review

Exam

Progress

Analytics

Settings

AI Chat

\---

Design Philosophy

Minimal.

Fast.

No distractions.

No social features.

No advertisements.

No leaderboards.

No gamification beyond meaningful progress.

Learning should feel calm and focused.

\---

Future Features

Voice tutoring

Handwriting recognition

Diagram generation

Flashcards

Formula sheets

Offline mode

Mobile application

Collaborative sessions

University course support

Research mode

Citation mode

Scientific calculator

Whiteboard

PDF annotation

Learning analytics

Knowledge dependency visualization

\---

Development Order

Phase 1

Project setup

Authentication

Database

Basic UI

AI integration

\---

Phase 2

Knowledge graph

Lesson generation

Quiz generation

Student profiles

\---

Phase 3

Mastery engine

Mistake analysis

Adaptive learning

Progress dashboard

\---

Phase 4

Exam simulator

Spaced repetition

Advanced analytics

AI tutoring

\---

Phase 5

Material ingestion pipeline

OCR

Knowledge extraction

Concept graph generation

Prompt optimization

\---

Success Criteria

The platform is successful if, after several months of use:

The AI knows the student's strengths and weaknesses better than the student does.

Every study session is personalized.

Every question has a purpose.

Every mistake becomes actionable feedback.

Every concept is learned to mastery.

The platform continuously answers one question:

"What is the single highest-impact thing this student should learn next?"