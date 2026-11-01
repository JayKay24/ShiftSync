import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Put,
  Get,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SwapService } from './swap.service';
import {
  CreateSwapRequest,
  CreateSwapRequestSchema,
  ApproveSwapRequest,
  ApproveSwapRequestSchema,
  CursorPaginationParams,
  CursorPaginationQuerySchema,
  CursorPaginatedResponse,
  SwapRequestResponse,
  PaginatedSwapsResponseSchema,
  BaseSwapRequest,
  BaseSwapRequestSchema,
  ActionMessageResponse,
  ActionMessageResponseSchema,
  ApproveSwapResponse,
  ApproveSwapResponseSchema,
  UuidSchema,
} from '@shiftsync/data-access';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Controller managing shift swap and drop lifecycle requests, peer responses, and manager approvals.
 */
@ApiTags('Swaps')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('swaps')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  /**
   * Retrieves paginated shift swap requests scoped to user role and location certifications.
   *
   * @param {any} req - Authenticated HTTP request containing actor identity.
   * @param {CursorPaginationParams} query - Cursor pagination parameters.
   * @returns {Promise<CursorPaginatedResponse<SwapRequestResponse>>} Paginated swap requests slice.
   */
  @Get()
  @ApiOperation({ summary: 'List swap and drop requests' })
  @ApiOkResponse({
    standardSchema: PaginatedSwapsResponseSchema,
    description: 'Paginated swap requests',
  })
  @SerializeOptions({ schema: PaginatedSwapsResponseSchema })
  async get(
    @Req() req,
    @Query({ schema: CursorPaginationQuerySchema })
    query: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<SwapRequestResponse>> {
    return this.swapService.getSwapRequests(req.user.userId, req.user.role, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /**
   * Submits a new shift swap or drop request.
   *
   * @param {CreateSwapRequest} dto - Validated swap creation payload.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<BaseSwapRequest>} Newly created swap request record.
   */
  @Post('request')
  @Roles('Staff')
  @ApiOperation({ summary: 'Initiate a shift swap or drop request' })
  @ApiCreatedResponse({
    standardSchema: BaseSwapRequestSchema,
    description: 'Swap request submitted',
  })
  @SerializeOptions({ schema: BaseSwapRequestSchema })
  async request(
    @Body({ schema: CreateSwapRequestSchema }) dto: CreateSwapRequest,
    @Req() req,
  ): Promise<BaseSwapRequest> {
    return this.swapService.requestSwap(
      req.user.userId,
      dto.shiftId,
      dto.reason,
      dto.targetUserId,
    );
  }

  /**
   * Accepts a pending targeted peer swap request.
   *
   * @param {string} id - Swap request UUID.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ActionMessageResponse>} Acceptance status message.
   */
  @Put('accept/:id')
  @Roles('Staff')
  @ApiOperation({ summary: 'Accept a targeted peer swap request' })
  @ApiOkResponse({
    standardSchema: ActionMessageResponseSchema,
    description: 'Swap request accepted by peer',
  })
  @SerializeOptions({ schema: ActionMessageResponseSchema })
  async accept(
    @Param('id', { schema: UuidSchema }) id: string,
    @Req() req,
  ): Promise<ActionMessageResponse> {
    return this.swapService.acceptSwap(req.user.userId, id);
  }

  /**
   * Declines a pending targeted peer swap request.
   *
   * @param {string} id - Swap request UUID.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ActionMessageResponse>} Decline status message.
   */
  @Put('reject/:id')
  @Roles('Staff')
  @ApiOperation({ summary: 'Decline a targeted peer swap request' })
  @ApiOkResponse({
    standardSchema: ActionMessageResponseSchema,
    description: 'Swap request declined',
  })
  @SerializeOptions({ schema: ActionMessageResponseSchema })
  async reject(
    @Param('id', { schema: UuidSchema }) id: string,
    @Req() req,
  ): Promise<ActionMessageResponse> {
    return this.swapService.declineSwap(req.user.userId, id);
  }

  /**
   * Cancels an active swap request initiated by the requesting user.
   *
   * @param {string} id - Swap request UUID.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ActionMessageResponse>} Cancellation status message.
   */
  @Put('cancel/:id')
  @Roles('Staff')
  @ApiOperation({ summary: 'Cancel an active swap request' })
  @ApiOkResponse({
    standardSchema: ActionMessageResponseSchema,
    description: 'Swap request cancelled',
  })
  @SerializeOptions({ schema: ActionMessageResponseSchema })
  async cancel(
    @Param('id', { schema: UuidSchema }) id: string,
    @Req() req,
  ): Promise<ActionMessageResponse> {
    return this.swapService.cancelSwap(req.user.userId, id);
  }

  /**
   * Finalizes manager approval or rejection of a shift swap request.
   *
   * @param {string} id - Swap request UUID.
   * @param {ApproveSwapRequest} body - Validated approval decision.
   * @param {any} req - Authenticated HTTP request.
   * @returns {Promise<ApproveSwapResponse>} Finalized swap approval status.
   */
  @Put('approve/:id')
  @Roles('Manager', 'Admin')
  @ApiOperation({ summary: 'Approve or reject a swap request as manager' })
  @ApiOkResponse({
    standardSchema: ApproveSwapResponseSchema,
    description: 'Swap request approved or rejected',
  })
  @SerializeOptions({ schema: ApproveSwapResponseSchema })
  async approve(
    @Param('id', { schema: UuidSchema }) id: string,
    @Body({ schema: ApproveSwapRequestSchema }) body: ApproveSwapRequest,
    @Req() req,
  ): Promise<ApproveSwapResponse> {
    return this.swapService.approveSwap(req.user.userId, id, body.approve);
  }
}
