-- Migration: add Team model, tournament systems/format, update Match/Set/RankingEntry

-- 1. Drop old FK constraints that reference removed columns
ALTER TABLE "RankingEntry" DROP CONSTRAINT "RankingEntry_playerId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_player1Id_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_player2Id_fkey";

-- 2. Create Team table
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey"
    FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey"
    FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Add new columns to Tournament
ALTER TABLE "Tournament" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'singles';
ALTER TABLE "Tournament" ADD COLUMN "system" TEXT NOT NULL DEFAULT 'round_robin';
ALTER TABLE "Tournament" ADD COLUMN "groups" INTEGER NOT NULL DEFAULT 1;

-- 4. Clear dependent tables (no production data yet)
TRUNCATE TABLE "Set";
TRUNCATE TABLE "Match";
TRUNCATE TABLE "RankingEntry";

-- 5. Modify Match: replace player columns with team columns, change round to INT, add group/status
ALTER TABLE "Match" DROP COLUMN "player1Id";
ALTER TABLE "Match" DROP COLUMN "player2Id";
ALTER TABLE "Match" DROP COLUMN "round";

ALTER TABLE "Match" ADD COLUMN "team1Id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Match" ADD COLUMN "team2Id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Match" ADD COLUMN "round" INTEGER;
ALTER TABLE "Match" ADD COLUMN "group" TEXT;
ALTER TABLE "Match" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE "Match" ALTER COLUMN "team1Id" DROP DEFAULT;
ALTER TABLE "Match" ALTER COLUMN "team2Id" DROP DEFAULT;

ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey"
    FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey"
    FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Rename Set score columns
ALTER TABLE "Set" RENAME COLUMN "player1Score" TO "team1Score";
ALTER TABLE "Set" RENAME COLUMN "player2Score" TO "team2Score";

-- 7. Modify RankingEntry: replace playerId with teamId, rename sets→games columns
DROP INDEX "RankingEntry_tournamentId_playerId_key";

ALTER TABLE "RankingEntry" DROP COLUMN "playerId";
ALTER TABLE "RankingEntry" DROP COLUMN "setsWon";
ALTER TABLE "RankingEntry" DROP COLUMN "setsLost";

ALTER TABLE "RankingEntry" ADD COLUMN "teamId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RankingEntry" ADD COLUMN "group" TEXT;
ALTER TABLE "RankingEntry" ADD COLUMN "gamesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankingEntry" ADD COLUMN "gamesLost" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RankingEntry" ALTER COLUMN "teamId" DROP DEFAULT;

CREATE UNIQUE INDEX "RankingEntry_tournamentId_teamId_key"
    ON "RankingEntry"("tournamentId", "teamId");

ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
