-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "address" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "birthday" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "bloodType" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "phone" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "sex" TEXT;

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gender" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "dob" TEXT,
    "religion" TEXT,
    "fatherOccupation" TEXT,
    "address" TEXT,
    "className" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
