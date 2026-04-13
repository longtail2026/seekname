-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" VARCHAR(50),
    "avatar" TEXT,
    "gender" CHAR(1),
    "birth_date" TIMESTAMP(3),
    "wx_openid" TEXT,
    "wx_unionid" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "vip_level" INTEGER NOT NULL DEFAULT 0,
    "vip_expire" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actual_amount" DECIMAL(10,2) NOT NULL,
    "pay_method" VARCHAR(20),
    "pay_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "pay_time" TIMESTAMP(3),
    "pay_trade_no" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "name_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "surname" VARCHAR(10) NOT NULL,
    "gender" CHAR(1) NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "birth_time" VARCHAR(10),
    "bazi_year" VARCHAR(10),
    "bazi_month" VARCHAR(10),
    "bazi_day" VARCHAR(10),
    "bazi_hour" VARCHAR(10),
    "wuxing_likes" TEXT[],
    "wuxing_avoids" TEXT[],
    "expectations" TEXT,
    "style" VARCHAR(20),
    "results" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'generating',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "cited_books" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "name_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_wx_openid_key" ON "users"("wx_openid");

-- CreateIndex
CREATE INDEX "idx_user_wx" ON "users"("wx_openid");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "idx_order_user" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_order_no" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "idx_order_pay" ON "orders"("pay_status");

-- CreateIndex
CREATE INDEX "idx_order_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_nr_user" ON "name_records"("user_id");

-- CreateIndex
CREATE INDEX "idx_nr_surname" ON "name_records"("surname");

-- CreateIndex
CREATE INDEX "idx_nr_status" ON "name_records"("status");

-- CreateIndex
CREATE INDEX "idx_nr_created" ON "name_records"("created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_name_record_id_fkey" FOREIGN KEY ("name_record_id") REFERENCES "name_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_records" ADD CONSTRAINT "name_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
