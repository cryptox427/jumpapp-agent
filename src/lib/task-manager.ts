import { prisma } from './prisma'

export interface TaskStep {
  stepNumber: number
  action: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: unknown
  error?: string
  timestamp: Date
}

export interface TaskContext {
  userId: string
  taskId: string
  currentStep: number
  totalSteps: number
  stepData: Record<string, unknown>
  metadata: Record<string, unknown>
}

export class TaskManager {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async createTask(title: string, description: string, type: 'EMAIL' | 'CALENDAR' | 'HUBSPOT' | 'GENERAL', metadata?: Record<string, unknown>) {
    const task = await prisma.task.create({
      data: {
        userId: this.userId,
        title,
        description,
        type,
        metadata: metadata as any,
        totalSteps: 1,
        currentStep: 0,
        stepData: {},
      },
    })

    return task
  }

  async updateTaskProgress(taskId: string, currentStep: number, stepData: Record<string, unknown>, status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED') {
    const updateData: Record<string, unknown> = {
      currentStep,
      stepData,
    }

    if (status) {
      updateData.status = status
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return task
  }

  async getActiveTasks() {
    const tasks = await prisma.task.findMany({
      where: {
        userId: this.userId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return tasks
  }

  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    return task
  }

  async continueTask(taskId: string, userMessage?: string) {
    const task = await this.getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    if (task.status === 'COMPLETED') {
      return { task, response: 'Task is already completed' }
    }

    // Return task context for AI to continue
    const context: TaskContext = {
      userId: task.userId,
      taskId: task.id,
      currentStep: task.currentStep,
      totalSteps: task.totalSteps,
      stepData: task.stepData as Record<string, unknown>,
      metadata: task.metadata as Record<string, unknown>,
    }

    return { task, context, userMessage }
  }

  async executeTaskStep(taskId: string, stepAction: string, stepData: Record<string, unknown>) {
    const task = await this.getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    try {
      // Update task progress
      const updatedTask = await this.updateTaskProgress(
        taskId,
        task.currentStep + 1,
        { ...(task.stepData as Record<string, unknown> || {}), [task.currentStep]: stepData },
        'IN_PROGRESS'
      )

      return { task: updatedTask, result: stepData }
    } catch (error) {
      // Mark task as failed
      await this.updateTaskProgress(taskId, task.currentStep, task.stepData as Record<string, unknown>, 'FAILED')
      throw error
    }
  }

  async completeTask(taskId: string, finalResult?: unknown) {
    const task = await this.getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const updatedTask = await this.updateTaskProgress(
      taskId,
      task.totalSteps,
      { ...(task.stepData as Record<string, unknown> || {}), final: finalResult },
      'COMPLETED'
    )

    return updatedTask
  }

  async cancelTask(taskId: string, reason?: string) {
    const task = await this.getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const updatedTask = await this.updateTaskProgress(
      taskId,
      task.currentStep,
      { ...(task.stepData as Record<string, unknown> || {}), cancellationReason: reason },
      'CANCELLED'
    )

    return updatedTask
  }

  // Helper method to create multi-step tasks
  async createMultiStepTask(title: string, description: string, steps: string[], type: 'EMAIL' | 'CALENDAR' | 'HUBSPOT' | 'GENERAL', metadata?: Record<string, unknown>) {
    const task = await prisma.task.create({
      data: {
        userId: this.userId,
        title,
        description,
        type,
        metadata: { ...metadata, steps },
        totalSteps: steps.length,
        currentStep: 0,
        stepData: {},
      },
    })

    return task
  }
}