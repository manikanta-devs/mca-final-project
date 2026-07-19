# TalentForge AI: Journal Publication Application Documentation

This document contains the supplementary files required for applying to academic journals (such as IJRASET, JETIR, or IEEE conferences), including the **Cover Letter to the Editor**, the **Author Declaration & Conflict of Interest Statement**, and **Online Submission Metadata**.

---

## ✉️ Section 1: Cover Letter to the Editor-in-Chief

**Date:** July 19, 2026  
**To:**  
The Editor-in-Chief,  
*International Journal for Applied Science & Engineering Technology (IJRASET)*  

**Subject: Submission of Research Manuscript for Peer Review and Publication**

Dear Editor-in-Chief,

I am writing to submit our research manuscript entitled **"Design and Empirical Evaluation of TalentForge: A Cost-Optimized, Resume-Driven Mock Interview System with Multi-Provider AI Fallback and Real-Time Performance Analytics"** for consideration for publication as an original research article in *IJRASET*.

This paper introduces *TalentForge*, an open-source, full-stack, resume-driven mock interview system designed to address the reliability and high cost constraints of using single-provider proprietary AI integrations in educational technology. 

### Core Contributions of Our Research:
1.  **Multi-Provider Fallback Orchestrator:** A thread-safe, cascading routing engine that automatically resolves API timeouts and rate limits (HTTP 429) by shifting traffic across seven different providers (Gemini, Groq, OpenRouter, etc.).
2.  **Low-Resource Optimization:** Implementation of lazy-loading design patterns for heavy NLP models (spaCy), restricting active backend memory to under 60 MB and enabling deployment on free-tier 1 GB RAM cloud servers (AWS EC2 t3.micro).
3.  **Simulated Concurrency Benchmarks:** A discrete-event stochastic simulation demonstrating 100% failover coverage and sub-second response times under concurrent loads scaling up to 500 requests.

This manuscript has not been published elsewhere and is not under consideration by any other journal. All co-authors have approved the submission and agree with its contents. We believe this work aligns closely with your journal’s scope in Artificial Intelligence, Software Engineering, and Educational Technologies.

Thank you for your time and consideration.

Sincerely,

**Mamidi Manikanta** (Corresponding Author)  
Department of Computer Applications,  
Sir C. R. Reddy College (Autonomous), Eluru, Andhra Pradesh, India.  
*Email:* (Insert your email address)  
*Phone:* (Insert your phone number)  

---

## 📜 Section 2: Author Declaration & Conflict of Interest Statement

### 1. Statement of Originality
We, the undersigned, hereby declare that the manuscript entitled **"Design and Empirical Evaluation of TalentForge..."** is our original work. It contains no plagiarized material, and all sources of reference have been properly cited.

### 2. Conflict of Interest Declaration
The authors declare that they have no known competing financial interests or personal relationships that could have appeared to influence the work reported in this paper.

### 3. Funding Acknowledgment
This research did not receive any specific grant from funding agencies in the public, commercial, or not-for-profit sectors. The system was designed and simulated using free-tier cloud configurations and open-source models.

**Author Signatures:**

___________________________  
**Mamidi Manikanta**  
(MCA Student, Sir C. R. Reddy College)

___________________________  
**Mrs. Mehaboob Karishma, MCA, M.Tech (CSE)**  
(Assistant Professor & Project Guide, Sir C. R. Reddy College)

---

## 📋 Section 3: Online Submission Form Metadata
*Use these values to copy-paste directly into the journal's online submission form.*

| Field | Copy-Paste Value |
|:---|:---|
| **Manuscript Title** | Design and Empirical Evaluation of TalentForge: A Cost-Optimized, Resume-Driven Mock Interview System with Multi-Provider AI Fallback and Real-Time Performance Analytics |
| **Short Running Title** | TalentForge AI Mock Interview Platform |
| **Abstract** | Automated mock interview platforms serve as a vital tool to bridge the gap between academic preparation and professional employment. However, standard solutions frequently rely on static question banks that fail to match a candidate's background, or depend heavily on single-provider cloud APIs that are susceptible to latency spikes, rate-limiting, and cost barriers. This paper introduces TalentForge, a resilient, full-stack, and self-hosted platform designed to provide personalized interview simulation. The system leverages natural language processing to extract skills and achievements from candidate resumes to generate tailored questions. To address the vulnerability of proprietary model failures, we design a thread-safe multi-provider fallback engine spanning seven providers, including Google Gemini, Groq, and localized lightweight fallback processing. Deployed on an AWS EC2 t3.micro server, the platform utilizes just 56.6 MB of active RAM and is designed to resolve API failovers through an automated cascading fallback mechanism. A simulation-based evaluation modeling typical provider latency and reliability characteristics indicates the architecture can maintain sub-second average response times and full failover coverage under concurrent load, suggesting the design is suitable for cost-constrained automated career coaching deployments. |
| **Keywords** | Artificial Intelligence, Natural Language Processing, Resume Parsing, Fallback System, Human-Computer Interaction, Mock Interview, STAR Method, System Optimization |
| **Subject Area** | Computer Science / Software Engineering / Intelligent Systems |
| **Author 1 (Primary)** | Mamidi Manikanta (Affiliation: Sir C. R. Reddy College, Eluru, India) |
| **Author 2 (Co-Author)**| Mrs. Mehaboob Karishma (Affiliation: Sir C. R. Reddy College, Eluru, India) |
| **GitHub Repository Link**| `https://github.com/manikanta-devs/9240126-AI-BASED-RESUME-DRIVEN-INTERVIEW-SYSTEM-WITH-PERFORMANCE-ANALYTICS.git` |
