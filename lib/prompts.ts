export interface Prompt {
  id: string;
  title: string;
  text: string;
  category: string;
}

export const PROMPT_CATEGORIES = [
  "All", "Writing", "Coding", "Analysis", "Research",
  "Creative", "Productivity", "Health", "Finance", "Education", "Fun",
];

export const PROMPTS: Prompt[] = [
  { id: "w1", category: "Writing", title: "Email Draft", text: "Write a professional email to [recipient] about [topic]. Keep it concise and action-oriented." },
  { id: "w2", category: "Writing", title: "Blog Post Outline", text: "Create a detailed outline for a blog post about [topic] targeting [audience]. Include intro, 5 main sections, and conclusion." },
  { id: "w3", category: "Writing", title: "Cover Letter", text: "Write a compelling cover letter for a [job title] position at [company]. Highlight relevant experience and enthusiasm." },
  { id: "w4", category: "Writing", title: "Product Description", text: "Write an engaging product description for [product]. Focus on benefits, not features, and include a call to action." },
  { id: "w5", category: "Writing", title: "Social Media Post", text: "Create 5 engaging social media posts about [topic] for [platform]. Include relevant hashtags." },
  { id: "w6", category: "Writing", title: "Executive Summary", text: "Write a concise executive summary for [document/project]. Highlight key points, findings, and recommendations in under 200 words." },

  { id: "c1", category: "Coding", title: "Code Review", text: "Review the following code for bugs, performance issues, and best practices. Suggest improvements:\n\n```\n[paste code here]\n```" },
  { id: "c2", category: "Coding", title: "Explain Code", text: "Explain this code step by step, as if teaching a junior developer:\n\n```\n[paste code here]\n```" },
  { id: "c3", category: "Coding", title: "Debug Help", text: "I'm getting this error: [error message]. Here's my code:\n\n```\n[paste code here]\n```\n\nWhat's causing it and how do I fix it?" },
  { id: "c4", category: "Coding", title: "Write Unit Tests", text: "Write comprehensive unit tests for this function/class:\n\n```\n[paste code here]\n```" },
  { id: "c5", category: "Coding", title: "Optimize Performance", text: "Analyze this code for performance bottlenecks and suggest optimizations:\n\n```\n[paste code here]\n```" },
  { id: "c6", category: "Coding", title: "API Design", text: "Design a RESTful API for [feature/application]. Include endpoints, request/response formats, and authentication approach." },

  { id: "a1", category: "Analysis", title: "SWOT Analysis", text: "Perform a detailed SWOT analysis for [company/product/idea]. Include at least 3 items per category with explanations." },
  { id: "a2", category: "Analysis", title: "Data Interpretation", text: "Analyze this data and provide key insights, trends, and actionable recommendations:\n\n[paste data here]" },
  { id: "a3", category: "Analysis", title: "Competitive Analysis", text: "Compare [product/company] with its top 3 competitors. Focus on pricing, features, target market, and differentiators." },
  { id: "a4", category: "Analysis", title: "Risk Assessment", text: "Identify and assess the top risks for [project/business/decision]. For each risk, provide probability, impact, and mitigation strategy." },
  { id: "a5", category: "Analysis", title: "Root Cause Analysis", text: "Help me identify the root cause of [problem]. Use the 5 Whys method and suggest preventive measures." },

  { id: "r1", category: "Research", title: "Topic Overview", text: "Give me a comprehensive overview of [topic]. Include history, current state, key players, and future outlook." },
  { id: "r2", category: "Research", title: "Pros and Cons", text: "List the detailed pros and cons of [topic/decision/technology]. Be balanced and consider different perspectives." },
  { id: "r3", category: "Research", title: "Compare Options", text: "Compare [option A] vs [option B] across these dimensions: cost, ease of use, scalability, and support. Which is better for [use case]?" },
  { id: "r4", category: "Research", title: "Literature Summary", text: "Summarize the current state of research on [topic]. Include key findings, debates, and gaps in knowledge." },
  { id: "r5", category: "Research", title: "Fact Check", text: "Verify this claim and provide supporting or contradicting evidence: [claim]" },

  { id: "cr1", category: "Creative", title: "Story Starter", text: "Write the opening 3 paragraphs of a [genre] story set in [setting] featuring [character type]. Make it immediately gripping." },
  { id: "cr2", category: "Creative", title: "Brainstorm Ideas", text: "Generate 20 creative ideas for [project/problem]. Be unconventional and think outside the box." },
  { id: "cr3", category: "Creative", title: "Metaphor Generator", text: "Create 10 unique metaphors to describe [concept] for [audience]. Make them vivid and memorable." },
  { id: "cr4", category: "Creative", title: "Character Development", text: "Create a detailed character profile for [character description] including backstory, motivations, flaws, and speech patterns." },
  { id: "cr5", category: "Creative", title: "Name Ideas", text: "Generate 20 creative name ideas for [product/company/project]. Include the meaning or rationale for each." },

  { id: "p1", category: "Productivity", title: "Meeting Agenda", text: "Create a structured agenda for a [duration] meeting about [topic]. Include time allocations and desired outcomes for each item." },
  { id: "p2", category: "Productivity", title: "Project Plan", text: "Create a high-level project plan for [project]. Include phases, key milestones, dependencies, and resource requirements." },
  { id: "p3", category: "Productivity", title: "Prioritize Tasks", text: "Help me prioritize these tasks using the Eisenhower Matrix:\n\n[list your tasks here]" },
  { id: "p4", category: "Productivity", title: "Weekly Review", text: "Help me conduct a weekly review. I'll share what happened this week: [summary]. Ask me questions to extract learnings and plan next week." },
  { id: "p5", category: "Productivity", title: "Decision Framework", text: "Help me make a decision about [decision]. What factors should I consider? What information am I missing?" },
  { id: "p6", category: "Productivity", title: "Delegation Guide", text: "I need to delegate [task] to [person]. Help me write clear instructions including context, requirements, timeline, and success criteria." },

  { id: "h1", category: "Health", title: "Workout Plan", text: "Create a [duration] workout plan for [fitness goal]. I have access to [equipment] and can train [frequency] per week. Current fitness level: [beginner/intermediate/advanced]." },
  { id: "h2", category: "Health", title: "Meal Prep Ideas", text: "Suggest a week of healthy meal prep ideas for [dietary preference]. Include prep time and approximate calories per meal." },
  { id: "h3", category: "Health", title: "Symptom Overview", text: "Explain common causes and general information about [symptom]. Note: This is for educational purposes only and not medical advice." },
  { id: "h4", category: "Health", title: "Stress Management", text: "Suggest evidence-based stress management techniques for someone dealing with [type of stress]. Include quick and long-term strategies." },
  { id: "h5", category: "Health", title: "Sleep Optimization", text: "What are the most effective strategies to improve sleep quality? I currently struggle with [sleep issue]." },

  { id: "f1", category: "Finance", title: "Budget Template", text: "Help me create a monthly budget template for someone earning [income] with these regular expenses: [list expenses]. Include savings goals." },
  { id: "f2", category: "Finance", title: "Investment Basics", text: "Explain [investment type] for a complete beginner. Include how it works, risks, potential returns, and how to get started. Note: This is educational, not financial advice." },
  { id: "f3", category: "Finance", title: "Debt Payoff Strategy", text: "I have these debts: [list debts with amounts and interest rates]. Compare the avalanche vs snowball method for my situation." },
  { id: "f4", category: "Finance", title: "Financial Goal Planning", text: "Help me create a plan to achieve this financial goal: [goal] by [date]. My current savings rate is [amount] per month." },
  { id: "f5", category: "Finance", title: "Expense Analysis", text: "Analyze these expenses and suggest where I can cut back:\n\n[list your monthly expenses]" },

  { id: "e1", category: "Education", title: "Explain Simply", text: "Explain [complex concept] as if I'm a complete beginner. Use simple language, analogies, and real-world examples." },
  { id: "e2", category: "Education", title: "Study Plan", text: "Create a [duration] study plan to learn [subject/skill]. I can dedicate [hours] per day. Include resources and milestones." },
  { id: "e3", category: "Education", title: "Quiz Me", text: "Quiz me on [topic] with 10 questions of increasing difficulty. After each answer, tell me if I'm right and explain the correct answer." },
  { id: "e4", category: "Education", title: "Concept Map", text: "Create a concept map for [topic] showing how key ideas connect to each other. Present it as a structured outline." },
  { id: "e5", category: "Education", title: "Learning Resources", text: "What are the best resources (books, courses, websites, podcasts) to learn [skill/topic]? Sort by skill level." },

  { id: "fu1", category: "Fun", title: "Trivia Challenge", text: "Give me 10 interesting trivia questions about [topic]. Mix easy and hard questions and include surprising facts." },
  { id: "fu2", category: "Fun", title: "Would You Rather", text: "Create 10 thought-provoking 'Would You Rather' questions related to [theme]. Make them genuinely difficult to choose between." },
  { id: "fu3", category: "Fun", title: "Creative Challenge", text: "Give me a creative writing challenge: a story that must include [3 random objects/concepts] and be set in [unusual setting]." },
  { id: "fu4", category: "Fun", title: "Debate Me", text: "Take the opposite side of this argument and debate me: [your position]. Be persuasive and use real arguments." },
  { id: "fu5", category: "Fun", title: "Random Facts", text: "Tell me 10 fascinating and surprising facts about [topic] that most people don't know." },
];
