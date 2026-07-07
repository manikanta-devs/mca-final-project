DEFAULT_ROADMAP = {
    "target_role": "Software Engineer",
    "target_company": "Google",
    "readiness_score": 72,
    "est_days": 18,
    "difficulty": "Intermediate",
    "summary": "We generated this targeted learning roadmap focusing on DBMS, SQL queries, and core system design concepts.",
    "strengths": ["Python", "HTML/CSS", "React Frameworks", "Communication Clarity"],
    "weaknesses": [
        {"name": "SQL & Queries", "mastery": "68%", "priority": "High", "est_improvement": "+15%"},
        {"name": "DBMS Indexes", "mastery": "50%", "priority": "High", "est_improvement": "+25%"},
        {"name": "System Design", "mastery": "40%", "priority": "Medium", "est_improvement": "+20%"},
        {"name": "OS Networks", "mastery": "55%", "priority": "Medium", "est_improvement": "+15%"}
    ],
    "phases": [
        {
            "phase_num": 1,
            "title": "DBMS Fundamentals",
            "status": "Completed",
            "progress": 100,
            "why_matters": "Understanding relational algebra, database models, and transactions is a requirement for core backend questions.",
            "est_study_time": "4 Hours",
            "difficulty": "Easy",
            "learning_outcome": "Define 1NF/2NF/3NF normal forms and draw clear Entity Relationship diagrams.",
            "importance": "Critical",
            "resources": [
                {"name": "freeCodeCamp DBMS Tutorial", "type": "Video", "url": "https://www.youtube.com/watch?v=ztHopE5Wnpc"},
                {"name": "GeeksforGeeks DBMS Guide", "type": "Documentation", "url": "https://www.geeksforgeeks.org/dbms/"}
            ]
        },
        {
            "phase_num": 2,
            "title": "SQL Query Optimization",
            "status": "Current",
            "progress": 68,
            "why_matters": "Companies test candidates on writing complex nested JOINs and subqueries under timed pressure.",
            "est_study_time": "8 Hours",
            "difficulty": "Medium",
            "learning_outcome": "Write optimization routines using indexes and trace query latency factors.",
            "importance": "Critical",
            "resources": [
                {"name": "SQLBolt Practice lessons", "type": "Practice", "url": "https://sqlbolt.com/"},
                {"name": "Kudvenkat SQL Tutorials", "type": "Video", "url": "https://www.youtube.com/user/kudvenkat"}
            ]
        },
        {
            "phase_num": 3,
            "title": "Normalization & Transactions",
            "status": "Locked",
            "progress": 0,
            "why_matters": "ACID properties ensure secure concurrency flow in real-world application backends.",
            "est_study_time": "6 Hours",
            "difficulty": "Hard",
            "learning_outcome": "Audit write-ahead logs and design locking mechanisms for concurrent DB operations.",
            "importance": "High",
            "resources": [
                {"name": "Microsoft Transact-SQL Docs", "type": "Documentation", "url": "https://learn.microsoft.com/"},
                {"name": "Gate Smashers Normalization lecture", "type": "Video", "url": "https://www.youtube.com/c/GateSmashers"}
            ]
        },
        {
            "phase_num": 4,
            "title": "Database Mini Mock Interview",
            "status": "Locked",
            "progress": 0,
            "why_matters": "Simulating spoken technical questions prevents freezing during real interview drills.",
            "est_study_time": "3 Hours",
            "difficulty": "Hard",
            "learning_outcome": "Explain transaction isolation levels orally using structural STAR methodology.",
            "importance": "Critical",
            "resources": [
                {"name": "LeetCode Database problems", "type": "Practice", "url": "https://leetcode.com/problemset/database/"},
                {"name": "AstraPrep SQL Practice Room", "type": "Quiz", "url": "https://localhost:5173/dashboard/quiz"}
            ]
        }
    ],
    "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
    "progress_metrics": {
        "topics_completed": "4/12 Topics",
        "est_readiness": "82%",
        "days_remaining": "14 Days",
        "current_streak": "5 Days",
        "completion_pct": 66
    }
}

PREBUILT_ROADMAPS = {
    "dbms": {
        "target_role": "Backend Engineer (Databases)",
        "target_company": "Oracle",
        "readiness_score": 65,
        "est_days": 14,
        "difficulty": "Intermediate",
        "summary": "Focuses on relational databases, transaction levels, database design, normalization, query optimizations, and indexes.",
        "strengths": ["SQL Basics", "Table Creation", "Primary Keys"],
        "weaknesses": [
            {"name": "Transaction Isolation", "mastery": "50%", "priority": "High", "est_improvement": "+25%"},
            {"name": "Query Optimization", "mastery": "45%", "priority": "High", "est_improvement": "+30%"},
            {"name": "Database Sharding", "mastery": "30%", "priority": "Medium", "est_improvement": "+20%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "DBMS Fundamentals & Normalization",
                "status": "Completed",
                "progress": 100,
                "why_matters": "Core theory tested extensively in backend engineer rounds.",
                "est_study_time": "4 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Identify 1NF, 2NF, 3NF schemas and write schema scripts.",
                "importance": "Critical",
                "resources": [
                    {"name": "GeeksforGeeks DBMS Tutorial", "type": "Documentation", "url": "https://www.geeksforgeeks.org/dbms/"},
                    {"name": "Gate Smashers Normalization", "type": "Video", "url": "https://www.youtube.com/c/GateSmashers"}
                ]
            },
            {
                "phase_num": 2,
                "title": "Indexes and Execution Plans",
                "status": "Current",
                "progress": 45,
                "why_matters": "Enables writing production-grade sub-millisecond query responses.",
                "est_study_time": "6 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Use EXPLAIN ANALYZE to locate bottlenecks and optimize query speed.",
                "importance": "Critical",
                "resources": [
                    {"name": "Use The Index, Luke!", "type": "Documentation", "url": "https://use-the-index-luke.com/"},
                    {"name": "Hussein Nasser Database Course", "type": "Video", "url": "https://www.youtube.com/@hnasr"}
                ]
            },
            {
                "phase_num": 3,
                "title": "ACID Properties & Isolation Levels",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Necessary for understanding race conditions and data corruption risks.",
                "est_study_time": "5 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Contrast Dirty Read, Non-Repeatable Read, and Phantom Read isolation levels.",
                "importance": "High",
                "resources": [
                    {"name": "PostgreSQL Transaction Isolation Docs", "type": "Documentation", "url": "https://www.postgresql.org/docs/"}
                ]
            },
            {
                "phase_num": 4,
                "title": "Database Schema Design Board",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Tests systems design and architectural decisions under pressure.",
                "est_study_time": "4 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Design a relational schema for a collaborative workspace like Notion.",
                "importance": "Critical",
                "resources": [
                    {"name": "ByteByteGo Database Choices", "type": "Video", "url": "https://bytebytego.com/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "4/12 Topics",
            "est_readiness": "65%",
            "days_remaining": "14 Days",
            "current_streak": "5 Days",
            "completion_pct": 25
        }
    },
    "python": {
        "target_role": "Python/Backend Engineer",
        "target_company": "Netflix",
        "readiness_score": 78,
        "est_days": 12,
        "difficulty": "Intermediate",
        "summary": "Covers Python memory model, decorators, generators, multi-threading vs multi-processing, and Flask/Django web frameworks.",
        "strengths": ["Basic Syntax", "Object Oriented Concepts", "Scripting"],
        "weaknesses": [
            {"name": "Generators & Iterators", "mastery": "55%", "priority": "High", "est_improvement": "+15%"},
            {"name": "Decorators & Closures", "mastery": "45%", "priority": "High", "est_improvement": "+25%"},
            {"name": "GIL & Concurrency", "mastery": "35%", "priority": "Medium", "est_improvement": "+20%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "Advanced OOP & Memory Management",
                "status": "Completed",
                "progress": 100,
                "why_matters": "Important for structuring large clean backend python repositories.",
                "est_study_time": "3 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Master dunder methods, garbage collection, and variable references.",
                "importance": "High",
                "resources": [
                    {"name": "Real Python OOP Guide", "type": "Documentation", "url": "https://realpython.com/"}
                ]
            },
            {
                "phase_num": 2,
                "title": "Closures, Decorators & Generators",
                "status": "Current",
                "progress": 55,
                "why_matters": "Enables writing highly reuseable, clean, and memory-efficient functions.",
                "est_study_time": "5 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Write custom timing/caching decorators and lazy list data pipelines.",
                "importance": "Critical",
                "resources": [
                    {"name": "Corey Schafer Decorators", "type": "Video", "url": "https://www.youtube.com/user/schafer5"}
                ]
            },
            {
                "phase_num": 3,
                "title": "GIL & Concurrent Processing",
                "status": "Locked",
                "progress": 0,
                "why_matters": "GIL restricts CPU concurrency, requiring distinct multiprocessing paradigms.",
                "est_study_time": "6 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Implement ThreadPoolExecutor and ProcessPoolExecutor routines correctly.",
                "importance": "Critical",
                "resources": [
                    {"name": "Python Concurrency Docs", "type": "Documentation", "url": "https://docs.python.org/3/library/concurrency.html"}
                ]
            },
            {
                "phase_num": 4,
                "title": "Python Backend Simulation Mock",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Simulates custom oral coding interviews.",
                "est_study_time": "3 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Design a rate limiter middleware for Flask/FastAPI.",
                "importance": "High",
                "resources": [
                    {"name": "FastAPI Tutorial Docs", "type": "Documentation", "url": "https://fastapi.tiangolo.com/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "6/12 Topics",
            "est_readiness": "78%",
            "days_remaining": "12 Days",
            "current_streak": "6 Days",
            "completion_pct": 50
        }
    },
    "dsa": {
        "target_role": "Software Engineer (Core Algorithmic)",
        "target_company": "Google",
        "readiness_score": 50,
        "est_days": 30,
        "difficulty": "Advanced",
        "summary": "Focuses on linear and non-linear data structures, dynamic programming recursion, graph traversals, and complexity boundaries.",
        "strengths": ["Arrays", "HashMaps", "String Matching"],
        "weaknesses": [
            {"name": "Dynamic Programming", "mastery": "30%", "priority": "High", "est_improvement": "+35%"},
            {"name": "Graphs & BFS/DFS", "mastery": "40%", "priority": "High", "est_improvement": "+25%"},
            {"name": "Backtracking", "mastery": "45%", "priority": "Medium", "est_improvement": "+15%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "Linear Structures & Sorting Algorithms",
                "status": "Completed",
                "progress": 100,
                "why_matters": "Foundation for understanding data storage layout performance.",
                "est_study_time": "8 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Implement queues, stacks, merge sort, and binary search safely.",
                "importance": "Critical",
                "resources": [
                    {"name": "NeetCode Roadmap", "type": "Practice", "url": "https://neetcode.io/"}
                ]
            },
            {
                "phase_num": 2,
                "title": "Non-Linear Structures: Trees & Graphs",
                "status": "Current",
                "progress": 40,
                "why_matters": "Vital for routing algorithms, social networks, and database indexing structures.",
                "est_study_time": "12 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Write BFS/DFS traversal and find cycles in directed/undirected graphs.",
                "importance": "Critical",
                "resources": [
                    {"name": "Abdul Bari Algorithms", "type": "Video", "url": "https://www.youtube.com/@abdul_bari"}
                ]
            },
            {
                "phase_num": 3,
                "title": "Dynamic Programming Optimizations",
                "status": "Locked",
                "progress": 0,
                "why_matters": "DP questions are standard for filtering candidates at top companies.",
                "est_study_time": "15 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Transition dynamic formulations from top-down memoization to bottom-up tabulation.",
                "importance": "Critical",
                "resources": [
                    {"name": "MIT Intro to Algorithms", "type": "Video", "url": "https://ocw.mit.edu/"}
                ]
            },
            {
                "phase_num": 4,
                "title": "DSA Mock Board Simulation",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Explaining complex algorithmic thoughts orally is a key interview skill.",
                "est_study_time": "5 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Solve and explain a Hard Graph problem in 40 minutes.",
                "importance": "High",
                "resources": [
                    {"name": "LeetCode Problems Set", "type": "Practice", "url": "https://leetcode.com/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "3/15 Topics",
            "est_readiness": "50%",
            "days_remaining": "30 Days",
            "current_streak": "8 Days",
            "completion_pct": 20
        }
    },
    "web_dev": {
        "target_role": "Frontend Developer / Full Stack",
        "target_company": "Vercel",
        "readiness_score": 72,
        "est_days": 20,
        "difficulty": "Intermediate",
        "summary": "Emphasizes JavaScript execution model, DOM optimizations, React rendering lifecycles, and REST/GraphQL APIs.",
        "strengths": ["HTML & CSS Layouts", "React Basics", "Git Versioning"],
        "weaknesses": [
            {"name": "JS Event Loop", "mastery": "60%", "priority": "High", "est_improvement": "+20%"},
            {"name": "React Rendering Tuning", "mastery": "50%", "priority": "High", "est_improvement": "+25%"},
            {"name": "State Management (Redux/Zustand)", "mastery": "45%", "priority": "Medium", "est_improvement": "+20%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "Modern JavaScript & Event Loop",
                "status": "Completed",
                "progress": 100,
                "why_matters": "Enables writing performant asynchronous non-blocking frontend logic.",
                "est_study_time": "6 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Explain event loop, task queue, microtask queue, and closure bindings.",
                "importance": "Critical",
                "resources": [
                    {"name": "JavaScript.info tutorial", "type": "Documentation", "url": "https://javascript.info/"}
                ]
            },
            {
                "phase_num": 2,
                "title": "React Render Lifecycle & hooks",
                "status": "Current",
                "progress": 50,
                "why_matters": "Crucial for preventing memory leaks and unnecessary rerenders.",
                "est_study_time": "8 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Build custom hooks and optimize component tree using useMemo and memo.",
                "importance": "Critical",
                "resources": [
                    {"name": "Official React Documentation", "type": "Documentation", "url": "https://react.dev/"}
                ]
            },
            {
                "phase_num": 3,
                "title": "State Architecture & REST/GraphQL",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Large applications require robust data syncing patterns.",
                "est_study_time": "8 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Design clean state store schemas and integrate optimized API fetching policies.",
                "importance": "High",
                "resources": [
                    {"name": "Zustand State Guide", "type": "Documentation", "url": "https://zustand-demo.pmnd.rs/"}
                ]
            },
            {
                "phase_num": 4,
                "title": "Full Stack Dev Mock Practice",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Live coding tests require clean organization and speed.",
                "est_study_time": "4 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Create a fully functional search dashboard with debouncing and pagination.",
                "importance": "Critical",
                "resources": [
                    {"name": "Frontend Practice boards", "type": "Practice", "url": "https://www.frontendpractice.com/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "5/12 Topics",
            "est_readiness": "72%",
            "days_remaining": "20 Days",
            "current_streak": "4 Days",
            "completion_pct": 40
        }
    },
    "aptitude": {
        "target_role": "Quantitative Analyst",
        "target_company": "Jane Street",
        "readiness_score": 55,
        "est_days": 25,
        "difficulty": "Advanced",
        "summary": "Focuses on logical reasoning, probability, permutation combinations, time-speed-distance, and data interpretation puzzles.",
        "strengths": ["Basic Arithmetic", "Ratio and Proportion", "Puzzles"],
        "weaknesses": [
            {"name": "Probability & Combinatorics", "mastery": "40%", "priority": "High", "est_improvement": "+30%"},
            {"name": "Speed-Time-Distance Problems", "mastery": "45%", "priority": "High", "est_improvement": "+25%"},
            {"name": "Data Sufficiency", "mastery": "50%", "priority": "Medium", "est_improvement": "+15%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "Speed Arithmetic & Ratios",
                "status": "Completed",
                "progress": 100,
                "why_matters": "Speeds up numerical evaluation during mental arithmetic rounds.",
                "est_study_time": "5 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Solve division and fractional ratios under 15 seconds.",
                "importance": "High",
                "resources": [
                    {"name": "Khan Academy Algebra", "type": "Practice", "url": "https://www.khanacademy.org/"}
                ]
            },
            {
                "phase_num": 2,
                "title": "Probability & Combinatorics",
                "status": "Current",
                "progress": 40,
                "why_matters": "Fundamental math needed for finance modeling and algorithm optimization analysis.",
                "est_study_time": "8 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Calculate permutations of repeated sets and conditional probabilities.",
                "importance": "Critical",
                "resources": [
                    {"name": "Brilliant.org Probability Course", "type": "Practice", "url": "https://brilliant.org/"}
                ]
            },
            {
                "phase_num": 3,
                "title": "Analytical Puzzles & Reasoning",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Tests pure logic and ability to think clearly under stress.",
                "est_study_time": "6 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Resolve network flow logic problems and grid relation puzzles.",
                "importance": "High",
                "resources": [
                    {"name": "Ted-Ed Riddles", "type": "Video", "url": "https://ed.ted.com/"}
                ]
            },
            {
                "phase_num": 4,
                "title": "Citadel/Jane Street Mock Practice",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Prepares for high-stakes trading mental math rounds.",
                "est_study_time": "4 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Solve 80 mental math equations in 8 minutes with 90%+ accuracy.",
                "importance": "Critical",
                "resources": [
                    {"name": "Tradermath Prep Portal", "type": "Practice", "url": "https://www.tradermath.org/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "4/15 Topics",
            "est_readiness": "55%",
            "days_remaining": "25 Days",
            "current_streak": "7 Days",
            "completion_pct": 26
        }
    },
    "hr": {
        "target_role": "Tech Lead / Product Manager",
        "target_company": "Apple",
        "readiness_score": 85,
        "est_days": 8,
        "difficulty": "Easy",
        "summary": "Focuses on the STAR method (Situation, Task, Action, Result) for explaining leadership, conflict resolution, and career progression goals.",
        "strengths": ["Speaking Pacing", "Voice Clarity", "Professional Tone"],
        "weaknesses": [
            {"name": "Explaining Failures (STAR)", "mastery": "70%", "priority": "High", "est_improvement": "+15%"},
            {"name": "Conflict Resolution Examples", "mastery": "65%", "priority": "High", "est_improvement": "+20%"},
            {"name": "Salary Negotiation", "mastery": "60%", "priority": "Medium", "est_improvement": "+15%"}
        ],
        "phases": [
            {
                "phase_num": 1,
                "title": "Self Introduction & Storytelling",
                "status": "Completed",
                "progress": 100,
                "why_matters": "First impressions shape the entire interview direction.",
                "est_study_time": "2 Hours",
                "difficulty": "Easy",
                "learning_outcome": "Deliver a concise 90-second professional summary answering 'Tell me about yourself'.",
                "importance": "Critical",
                "resources": [
                    {"name": "Harvard Business Review Intro", "type": "Documentation", "url": "https://hbr.org/"}
                ]
            },
            {
                "phase_num": 2,
                "title": "STAR Method & Behavioral Banks",
                "status": "Current",
                "progress": 80,
                "why_matters": "Standard methodology expected by all major Tech recruiters.",
                "est_study_time": "3 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Outline stories for conflict, leadership, failure, and collaboration using STAR.",
                "importance": "Critical",
                "resources": [
                    {"name": "Dan Croitor STAR Interview Videos", "type": "Video", "url": "https://www.youtube.com/c/DanCroitor"}
                ]
            },
            {
                "phase_num": 3,
                "title": "Executive Presence & Handling Failure",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Evaluates maturity, self-awareness, and resilience.",
                "est_study_time": "2 Hours",
                "difficulty": "Medium",
                "learning_outcome": "Answer 'What is your greatest weakness' without sounding rehearsed or artificial.",
                "importance": "High",
                "resources": [
                    {"name": "Google Tech Lead Prep Guide", "type": "Documentation", "url": "https://careers.google.com/"}
                ]
            },
            {
                "phase_num": 4,
                "title": "Behavioral Panel Mock Drill",
                "status": "Locked",
                "progress": 0,
                "why_matters": "Prepares you to handle follow-up probing questions calmly.",
                "est_study_time": "2 Hours",
                "difficulty": "Hard",
                "learning_outcome": "Maintain strong eye contact, body language, and structuring during tough behavioral drills.",
                "importance": "Critical",
                "resources": [
                    {"name": "Exponent Behavioral Course", "type": "Video", "url": "https://www.tryexponent.com/"}
                ]
            }
        ],
        "pipeline": ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"],
        "progress_metrics": {
            "topics_completed": "4/8 Topics",
            "est_readiness": "85%",
            "days_remaining": "8 Days",
            "current_streak": "5 Days",
            "completion_pct": 50
        }
    }
}
