-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('KONSPEKT', 'SLAYD', 'TARJIMA', 'KURS_ISHI', 'REFERAT', 'LABORATORIYA', 'BOSHQA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('VIP_PURCHASE', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'COMMISSION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_FOR_CLIENT', 'RESOLVED_FOR_FREELANCER', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "fullname" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "vip_expires_at" TIMESTAMP(3),
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolio_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "badge" TEXT NOT NULL DEFAULT 'YANGI',
    "completion_rate" DOUBLE PRECISION,
    "avg_response_hrs" DOUBLE PRECISION,
    "referral_code" TEXT,
    "referred_by" INTEGER,
    "notif_prefs" JSONB NOT NULL DEFAULT '{}',
    "last_ip_address" TEXT,
    "device_hash" TEXT,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "freelancer_id" INTEGER,
    "category" "TaskCategory" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "price_min" INTEGER NOT NULL,
    "price_max" INTEGER NOT NULL,
    "agreed_price" INTEGER,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "attachment_file_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "rush_fee" INTEGER NOT NULL DEFAULT 0,
    "assigned_at" TIMESTAMP(3),
    "in_progress_at" TIMESTAMP(3),
    "in_review_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "freelancer_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "proposed_price" INTEGER NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "counter_price" INTEGER,
    "counter_message" TEXT,
    "counter_at" TIMESTAMP(3),
    "counter_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT,
    "file_id" TEXT,
    "file_type" TEXT,
    "file_name" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "is_counted_in_rating" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "package_type" TEXT NOT NULL,
    "screenshot_file_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "opened_by_user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "admin_notes" TEXT,
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_logs" (
    "id" SERIAL NOT NULL,
    "suspect_id" INTEGER NOT NULL,
    "target_id" INTEGER,
    "type" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "is_actioned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_tasks" (
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_tasks_pkey" PRIMARY KEY ("user_id","task_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_telegram_id_idx" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "users_is_banned_idx" ON "users"("is_banned");

-- CreateIndex
CREATE INDEX "users_is_vip_idx" ON "users"("is_vip");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_client_id_idx" ON "tasks"("client_id");

-- CreateIndex
CREATE INDEX "tasks_freelancer_id_idx" ON "tasks"("freelancer_id");

-- CreateIndex
CREATE INDEX "tasks_category_idx" ON "tasks"("category");

-- CreateIndex
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");

-- CreateIndex
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "tasks_is_urgent_idx" ON "tasks"("is_urgent");

-- CreateIndex
CREATE INDEX "bids_task_id_idx" ON "bids"("task_id");

-- CreateIndex
CREATE INDEX "bids_freelancer_id_idx" ON "bids"("freelancer_id");

-- CreateIndex
CREATE UNIQUE INDEX "bids_task_id_freelancer_id_key" ON "bids"("task_id", "freelancer_id");

-- CreateIndex
CREATE INDEX "chat_messages_task_id_idx" ON "chat_messages"("task_id");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_messages_is_read_idx" ON "chat_messages"("is_read");

-- CreateIndex
CREATE INDEX "reviews_to_user_id_idx" ON "reviews"("to_user_id");

-- CreateIndex
CREATE INDEX "reviews_is_counted_in_rating_idx" ON "reviews"("is_counted_in_rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_task_id_from_user_id_key" ON "reviews"("task_id", "from_user_id");

-- CreateIndex
CREATE INDEX "vip_payments_is_approved_idx" ON "vip_payments"("is_approved");

-- CreateIndex
CREATE INDEX "vip_payments_user_id_idx" ON "vip_payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_task_id_key" ON "disputes"("task_id");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "transaction_logs_user_id_idx" ON "transaction_logs"("user_id");

-- CreateIndex
CREATE INDEX "transaction_logs_task_id_idx" ON "transaction_logs"("task_id");

-- CreateIndex
CREATE INDEX "transaction_logs_status_idx" ON "transaction_logs"("status");

-- CreateIndex
CREATE INDEX "fraud_logs_suspect_id_idx" ON "fraud_logs"("suspect_id");

-- CreateIndex
CREATE INDEX "fraud_logs_is_actioned_idx" ON "fraud_logs"("is_actioned");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_payments" ADD CONSTRAINT "vip_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_tasks" ADD CONSTRAINT "saved_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_tasks" ADD CONSTRAINT "saved_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
