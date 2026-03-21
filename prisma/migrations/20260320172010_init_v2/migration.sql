/*
  Warnings:

  - You are about to drop the column `company_profile_id` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the `company_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "company_profiles" DROP CONSTRAINT "company_profiles_client_id_fkey";

-- DropForeignKey
ALTER TABLE "company_profiles" DROP CONSTRAINT "company_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_company_profile_id_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "board_members" TEXT[],
ADD COLUMN     "codice_fiscale" TEXT,
ADD COLUMN     "company_form" TEXT,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "employee_count" INTEGER,
ADD COLUMN     "industry_sector" TEXT,
ADD COLUMN     "legal_representative" TEXT,
ADD COLUMN     "registered_address" TEXT,
ADD COLUMN     "shareholders" JSONB,
ADD COLUMN     "subsidiaries" JSONB,
ADD COLUMN     "vat_number" TEXT;

-- AlterTable
ALTER TABLE "framework_steps" ADD COLUMN     "form_schema" JSONB;

-- AlterTable
ALTER TABLE "frameworks" ADD COLUMN     "base_prompt_template" TEXT;

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "company_profile_id",
ADD COLUMN     "tax_year" INTEGER;

-- AlterTable
ALTER TABLE "steps" ADD COLUMN     "form_data" JSONB,
ADD COLUMN     "form_schema" JSONB;

-- DropTable
DROP TABLE "company_profiles";
