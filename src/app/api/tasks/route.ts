import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TaskManager } from '@/lib/task-manager'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, taskId, ...data } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const taskManager = new TaskManager(user.id)

    let result

    switch (action) {
      case 'create':
        result = await taskManager.createTask(
          data.title,
          data.description,
          data.type,
          data.metadata
        )
        break

      case 'create_multi_step':
        result = await taskManager.createMultiStepTask(
          data.title,
          data.description,
          data.steps,
          data.type,
          data.metadata
        )
        break

      case 'continue':
        result = await taskManager.continueTask(taskId, data.userMessage)
        break

      case 'cancel':
        result = await taskManager.cancelTask(taskId, data.reason)
        break

      case 'complete':
        result = await taskManager.completeTask(taskId, data.finalResult)
        break

      case 'get_active':
        result = await taskManager.getActiveTasks()
        break

      case 'get_by_id':
        result = await taskManager.getTaskById(taskId)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Task management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_active'
    const taskId = searchParams.get('taskId')

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const taskManager = new TaskManager(user.id)

    let result

    switch (action) {
      case 'get_active':
        result = await taskManager.getActiveTasks()
        break

      case 'get_by_id':
        if (!taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
        }
        result = await taskManager.getTaskById(taskId)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Task management error:', error)
    return NextResponse.json(
      { error: 'Failed to get tasks', details: (error as Error).message },
      { status: 500 }
    )
  }
}
