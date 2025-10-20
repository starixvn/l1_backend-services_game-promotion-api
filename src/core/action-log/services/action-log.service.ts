import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActionLog } from '../schemas/action-log.schema';
import { IActionLog } from '../interfaces/action-log.interface';

/**
 * Service for managing action logs in MongoDB
 */
@Injectable()
export class ActionLogService {
  constructor(
    @InjectModel(ActionLog.name, 'logs')
    private readonly actionLogModel: Model<ActionLog>,
  ) {}

  /**
   * Save an action log to MongoDB
   * @param logData - The log data to save
   * @returns The saved log document
   */
  async saveLog(logData: IActionLog): Promise<ActionLog | null> {
    try {
      const log = new this.actionLogModel(logData);
      return await log.save();
    } catch (error) {
      // Fail silently to not disrupt the main application flow
      console.error('Failed to save action log to MongoDB:', error);
      return null;
    }
  }

  /**
   * Get logs by operator ID
   * @param operatorId - The operator identifier
   * @param limit - Maximum number of logs to return
   * @param skip - Number of logs to skip
   * @returns Array of action logs
   */
  async getLogsByOperator(
    operatorId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ActionLog[]> {
    return this.actionLogModel
      .find({ operatorId })
      .sort({ logTimeStamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();
  }

  /**
   * Get logs by player ID
   * @param playerId - The player identifier
   * @param limit - Maximum number of logs to return
   * @param skip - Number of logs to skip
   * @returns Array of action logs
   */
  async getLogsByPlayer(
    playerId: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ActionLog[]> {
    return this.actionLogModel
      .find({ 'request.playerId': playerId })
      .sort({ logTimeStamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();
  }

  /**
   * Get logs by action type
   * @param action - The action type
   * @param limit - Maximum number of logs to return
   * @param skip - Number of logs to skip
   * @returns Array of action logs
   */
  async getLogsByAction(
    action: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ActionLog[]> {
    return this.actionLogModel
      .find({ action })
      .sort({ logTimeStamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();
  }

  /**
   * Get error logs (logs with errorCode)
   * @param limit - Maximum number of logs to return
   * @param skip - Number of logs to skip
   * @returns Array of error logs
   */
  async getErrorLogs(limit: number = 100, skip: number = 0): Promise<ActionLog[]> {
    return this.actionLogModel
      .find({ 'response.errorCode': { $exists: true } })
      .sort({ logTimeStamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();
  }

  /**
   * Get logs within a date range
   * @param startDate - Start date (ISO 8601 string)
   * @param endDate - End date (ISO 8601 string)
   * @param limit - Maximum number of logs to return
   * @param skip - Number of logs to skip
   * @returns Array of action logs
   */
  async getLogsByDateRange(
    startDate: string,
    endDate: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<ActionLog[]> {
    return this.actionLogModel
      .find({
        logTimeStamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ logTimeStamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();
  }

  /**
   * Delete old logs (cleanup)
   * @param daysToKeep - Number of days to keep logs
   * @returns Number of deleted logs
   */
  async deleteOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateString = cutoffDate.toISOString();

    const result = await this.actionLogModel
      .deleteMany({ logTimeStamp: { $lt: cutoffDateString } })
      .exec();

    return result.deletedCount;
  }
}
