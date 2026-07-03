import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RejectRequestDTO {
    @IsString() @IsNotEmpty({ message: "Phải có lý do từ chối!" });
    @MinLength(5) @MaxLength(500)
    reason!: string

    @IsOptional() @IsString()
    duplicatedLocationId?: string

}