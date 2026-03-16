-- Migration: add Team model, tournament systems/format, update Match/Set/RankingEntry

-- 1. Drop old FK constraints (IF EXISTS for safety)
ALTER TABLE "RankingEntry" DROP CONSTRAINT IF EXISTS "RankingEntry_playerId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_player1Id_fkey";
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_player2Id_fkey";

-- 2. Create Team table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Team_tournamentId_fkey'
    ) THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey"
            FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Team_player1Id_fkey'
    ) THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey"
            FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Team_player2Id_fkey'
    ) THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey"
            FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Add new columns to Tournament (IF NOT EXISTS)
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'singles';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "system" TEXT NOT NULL DEFAULT 'round_robin';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "groups" INTEGER NOT NULL DEFAULT 1;

-- 4. Clear dependent tables (no production data yet)
TRUNCATE TABLE "Set", "Match" CASCADE;
TRUNCATE TABLE "RankingEntry";

-- 5. Modify Match: remove old player columns, add team columns + round(INT)/group/status
ALTER TABLE "Match" DROP COLUMN IF EXISTS "player1Id";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "player2Id";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "round";

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team1Id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team2Id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" INTEGER;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE "Match" ALTER COLUMN "team1Id" DROP DEFAULT;
ALTER TABLE "Match" ALTER COLUMN "team2Id" DROP DEFAULT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Match_team1Id_fkey'
    ) THEN
        ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey"
            FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Match_team2Id_fkey'
    ) THEN
        ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey"
            FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Rename Set score columns (handle idempotency)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Set' AND column_name = 'player1Score'
    ) THEN
        ALTER TABLE "Set" RENAME COLUMN "player1Score" TO "team1Score";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Set' AND column_name = 'player2Score'
    ) THEN
        ALTER TABLE "Set" RENAME COLUMN "player2Score" TO "team2Score";
    END IF;
END $$;

-- 7. Modify RankingEntry: replace playerId→teamId, setsWon/Lost→gamesWon/Lost
DROP INDEX IF EXISTS "RankingEntry_tournamentId_playerId_key";

ALTER TABLE "RankingEntry" DROP COLUMN IF EXISTS "playerId";
ALTER TABLE "RankingEntry" DROP COLUMN IF EXISTS "setsWon";
ALTER TABLE "RankingEntry" DROP COLUMN IF EXISTS "setsLost";

ALTER TABLE "RankingEntry" ADD COLUMN IF NOT EXISTS "teamId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RankingEntry" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "RankingEntry" ADD COLUMN IF NOT EXISTS "gamesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankingEntry" ADD COLUMN IF NOT EXISTS "gamesLost" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RankingEntry" ALTER COLUMN "teamId" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "RankingEntry_tournamentId_teamId_key"
    ON "RankingEntry"("tournamentId", "teamId");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RankingEntry_teamId_fkey'
    ) THEN
        ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
