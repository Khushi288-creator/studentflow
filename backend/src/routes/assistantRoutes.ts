import express from 'express'
import OpenAI from 'openai'

const router = express.Router()

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

function getSystemPrompt(role: string): string {
  if (role === 'teacher') {
    return `You are a smart AI assistant for teachers in a school management system called StudentFlow.

You help teachers with:
- How to create good assignments (structure, marks, deadlines, difficulty level)
- Attendance management (how much attendance is ideal, how to track, rules)
- How to explain topics clearly to students
- Lesson planning and teaching strategies
- How to evaluate student performance and give feedback
- Managing classroom effectively
- Any subject-related questions (math, science, english, etc.)
- General questions on any topic

Be professional, helpful, and give practical advice. Answer any question clearly.`
  }

  if (role === 'admin') {
    return `You are a smart AI assistant for school admins in StudentFlow.

You help admins with:
- Managing students, teachers, fees, salary
- School policies and best practices
- How to handle fee structures and payments
- Event and holiday planning
- Reports and data analysis
- Any general or management question

Be professional and concise. Answer any question on any topic.`
  }

  // student (default)
  return `You are a friendly and smart AI assistant for students in StudentFlow school app.

You help students with:
- Any subject: math, science, english, history, coding, etc.
- Homework help and explanations
- Study tips and exam preparation
- School system: attendance, fees, assignments, results
- Career guidance and motivation
- General questions: travel, food, health, technology, anything

Be friendly, encouraging, and explain things simply. Answer any question the student asks.`
}

router.post('/assistant/chat', async (req, res) => {
  try {
    const { message, role, history } = req.body as {
      message: string
      role?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
    }

    if (!message?.trim()) {
      return res.status(400).json({ reply: 'Please send a message.' })
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt(role ?? 'student') },
      ...(history ?? []).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message.trim() },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response."
    res.json({ reply })
  } catch (err: any) {
    console.error('[assistant] error:', err?.message)
    res.status(500).json({ reply: "I'm having trouble right now. Please try again." })
  }
})

export default router
