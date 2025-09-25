-- CreateTable
CREATE TABLE "invalidated_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'account_deleted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invalidated_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invalidated_tokens_token_id_key" ON "invalidated_tokens"("token_id");
