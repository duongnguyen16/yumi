import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { AuditLog, AuditLogDocument } from "src/common/schemas/audit-log.schema";
import { LocationRequest, LocationRequestDocument, LocationRequestStatus } from "src/common/schemas/location-request";
import { LocationDocument } from "src/common/schemas/location.schema";
import { TrustEngineService } from "../trust-engine/trust-engine.service";
import { ListPendingRequestsDTO } from "./dto/list-pending-requests.dto";

@Injectable
export class AdminLocationService {
    constructor(
        @InjectModel(LocationRequest.name) private reqModel: Model<LocationRequestDocument>,
        @InjectModel(Location.name) private locModel: Model<LocationDocument>,
        @InjectModel(AuditLog.name) private logModel: Modep<AuditLogDocument>,
        private readonly trust: TrustEngineService
    )

    async getList(q: ListPendingRequestsDTO) {
        try {
            const page = q.page ?? 1, limit = q.limit ?? 20; 
            const filter = { status: LocationRequestStatus.PENDING }

            const [list, total] = await Promise.all([
                this.reqModel.find(filter).sort({ isPotentialDuplicate: 1, createdAt: 1 }).skip((page - 1) * limit).limit(limit).populate('submittedBy', 'fullName email').populate('locationId', 'name address status').lean().exec(),
                this.reqModel.countDocument(filter).exec()
            ])

            const data = list.map((r) => ({
                ...r,
                flags: {
                    susDup: r.isPotentialDuplicate === true,
                    susDupLocId: r.suspectedDuplicateLocationIds ?? [],
                    farPin: typeof r.deviceDistanceMeters === "number" && r.
                }
            }))

        }
        catch (err) {
            console.log(`get list err: ${err}`);
            return {
                success: false,
                statusCode: 500,
                message: "Đang có xíu lỗi khi lấy danh sách"
            }
        }
    }

}