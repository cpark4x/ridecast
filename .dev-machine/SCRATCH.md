# SCRATCH.md — Ephemeral Working Notes

**Last updated:** 2026-03-06
**Current phase:** Phase 0 — Code complete, not yet deployed

---

## Phase 0 Known Issues (address before Phase 3)

### P0 — Must fix
- [ ] **"test-mode" error noise** — 4 `Processing failed: Error: test-mode — no real API calls` appear in `npm run test` output. Tests pass (151/158) but output is noisy. Investigate which mock is throwing and fix the isolation. Likely in Stripe or Anthropic mocks in Phase 0 specs.

### P1 — Before Phase 3 specs
- [ ] **Phase 0 integration pass** — manually verify the auth + subscription flow works end-to-end:
  1. Create a test Clerk app → add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to `.env.local`
  2. Start the app (`npm run dev`) → confirm `/` redirects to `/sign-in` for unauthenticated users
  3. Sign in → upload a piece of content → confirm User record in DB has real Clerk ID (not "default-user")
  4. Create a Stripe test product + price → set `STRIPE_PRICE_ID` → confirm `/api/upload` returns 403 for free users
  5. Complete a Stripe test checkout → confirm `user.subscriptionStatus` → "active"
  Only write Phase 3 specs after this passes.

- [ ] **Run the Azure deployment** — follow `docs/deployment.md` one-time setup:
  1. `az login` with Microsoft account
  2. Create resource group, ACR, PostgreSQL, Storage Account, Container App in East US 2
  3. Add `AZURE_CREDENTIALS` secret to GitHub → trigger first automated deployment
  4. Run `npx prisma migrate deploy` in the container
  5. Set all env vars via `az containerapp secret set`

---

## Dev Machine Workflow Learnings (apply to all future phases)

### Spec quality rules (confirmed through today's session)
1. **Read the current code before writing the spec** — quote it in the "Current State" section
2. **Show the full `vi.mock()` pattern** — not just "add a test." Machine matches mock patterns exactly.
3. **≤5 files per spec** — split larger changes into multiple specs
4. **Infrastructure specs need "Manual Setup Steps"** — the machine writes code, humans provision services
5. **"Scope" section is mandatory** — explicitly say what the spec does NOT change
6. **Add scope guard to specs**: "Do not modify files not listed in Files to Modify"

### Workflow rules (confirmed through today's session)
1. **Visual pass after every UI-touching batch** — use `browser-tester:visual-documenter` to catch what tests miss
2. **Set up machine format from day one** — features dict, build.yaml, iteration.yaml, working-session-instructions.md
3. **Infrastructure ≠ feature for verification** — "tests pass" is sufficient for features; infrastructure needs end-to-end human verification
4. **Phase transitions need an integration check** — before Phase 3 specs, verify Phase 0 works in real environment

---

## Phase 3 — Waiting on Phase 0 integration pass

Do not write Phase 3 specs until Phase 0 integration pass is complete (see above).

Planned Phase 3 items (from ROADMAP.md):
- Multi-Source Synthesis (#12)
- Episode Sharing (#10)
- Scheduled Production (#13)
- Voice Selection (#11)
- RSS/Podcast Feed Output (new)
- Pocket Refugee Capture (new, time-sensitive)
- "Ready to Commute" notification (new, depends on #13)
- Word-level transcript seek (new)
- CarPlay integration (new)

---

## Notes for Next Session

- All Phase 0 code is committed to `main`
- `docs/deployment.md` has the Azure setup runbook
- Phase 0 integration pass should take ~30 minutes with real service credentials
- After integration pass: update STATE.yaml to Phase 3 and write first batch of specs

## API Inventory (auto-generated 2026-03-11 07:55 UTC)

### TypeScript / JavaScript public exports
./prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/e2e/api-mocks.ts:15:export async function mockAiRoutes(page: Page): Promise<void> {
./.worktrees/feat-playback-persistence/src/middleware.ts:34:export default function middleware(request: NextRequest, event: NextFetchEvent) {
./.worktrees/feat-playback-persistence/src/middleware.ts:41:export const config = {
./.worktrees/feat-playback-persistence/src/app/pocket/BookmarkletLink.tsx:7:export function BookmarkletLink({ href }: BookmarkletLinkProps) {
./.worktrees/feat-playback-persistence/src/app/pocket/page.tsx:9:export default function PocketPage() {
./.worktrees/feat-playback-persistence/src/app/sign-up/[[...sign-up]]/page.tsx:3:export default function SignUpPage() {
./.worktrees/feat-playback-persistence/src/app/upgrade/page.tsx:4:export default function UpgradePage() {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:9:export const metadata: Metadata = {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:16:export default function RootLayout({ children }: { children: React.ReactNode }) {
./.worktrees/feat-playback-persistence/src/app/api/webhook/route.ts:5:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:8:export const maxDuration = 60;
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:12:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/save/route.ts:7:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/create-checkout-session/route.ts:6:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/library/route.ts:16:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:15:export const maxDuration = 180;
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:17:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/audio/[id]/route.ts:6:export async function GET(
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:5:export async function POST(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:38:export async function GET(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/me/route.ts:3:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/upload/route.ts:11:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:11:export const maxDuration = 120;
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:13:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/sign-in/[[...sign-in]]/page.tsx:3:export default function SignInPage() {
./.worktrees/feat-playback-persistence/src/app/save/page.tsx:84:export default function SavePage() {
./.worktrees/feat-playback-persistence/src/app/page.tsx:3:export default function Home() {
./.worktrees/feat-playback-persistence/src/components/UploadScreen.tsx:19:export function UploadScreen({ onProcess, onImportPocket }: UploadScreenProps) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:5:export const SMART_RESUME_REWIND_SECS = 3;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:6:export const SMART_RESUME_THRESHOLD_MS = 10_000;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:8:export interface PlayableItem {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:32:export function PlayerProvider({ children }: { children: ReactNode }) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:210:export function usePlayer() {
./.worktrees/feat-playback-persistence/src/components/PlayerBar.tsx:10:export function PlayerBar({ onExpand }: PlayerBarProps) {
./.worktrees/feat-playback-persistence/src/components/LibraryScreen.tsx:46:export function LibraryScreen({ visible }: LibraryScreenProps) {
./.worktrees/feat-playback-persistence/src/components/BottomNav.tsx:56:export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
./.worktrees/feat-playback-persistence/src/components/AppShell.tsx:16:export function AppShell() {
./.worktrees/feat-playback-persistence/src/components/ProcessingScreen.tsx:51:export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
./.worktrees/feat-playback-persistence/src/components/ExpandedPlayer.tsx:14:export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:16:export function SettingsScreen({ onClose }: { onClose: () => void }) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:102:export function useElevenLabsKey(): string | null {
./.worktrees/feat-playback-persistence/src/components/PocketImportScreen.tsx:15:export function PocketImportScreen({ onComplete }: PocketImportScreenProps) {
./.worktrees/feat-playback-persistence/src/components/CarMode.tsx:9:export function CarMode({ onExit }: CarModeProps) {
./.worktrees/feat-playback-persistence/src/components/HomeScreen.tsx:23:export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
./.worktrees/feat-playback-persistence/src/hooks/useCommuteDuration.ts:21:export function useCommuteDuration() {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:8:export function getStripeClient(): Stripe {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:17:export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:1:export interface ScriptSegment {
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:6:export function parseConversationScript(script: string): ScriptSegment[] {
./.worktrees/feat-playback-persistence/src/lib/utils/retry.ts:10:export async function retryWithBackoff<T>(
./.worktrees/feat-playback-persistence/src/lib/utils/hash.ts:3:export function contentHash(text: string): string {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:1:export const WORDS_PER_MINUTE = 150;
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:3:export function minutesToWords(minutes: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:7:export function wordsToMinutes(words: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:11:export function formatDuration(totalSeconds: number): string {
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:26:export async function uploadAudio(
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:45:export function isBlobStorageConfigured(): boolean {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:1:export interface ContentAnalysis {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:8:export interface ScriptConfig {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:15:export interface GeneratedScript {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:21:export interface AIProvider {
./.worktrees/feat-playback-persistence/src/lib/ai/claude.ts:34:export class ClaudeProvider implements AIProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/elevenlabs.ts:5:export class ElevenLabsTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/narrator.ts:23:export async function generateNarratorAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/openai.ts:5:export class OpenAITTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/chunk.ts:11:export function chunkText(text: string): string[] {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:1:export interface VoiceConfig {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:6:export interface TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/google.ts:5:export class GoogleCloudTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:53:export interface ConversationAudioResult {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:58:export async function generateConversationAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/provider.ts:6:export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:9:export function isByokInstance(): boolean {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:21:export async function hasActiveSubscription(userId: string): Promise<boolean> {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:36:export async function requireSubscription(userId: string): Promise<NextResponse | null> {
./.worktrees/feat-playback-persistence/src/lib/extractors/epub.ts:4:export async function extractEpub(buffer: Buffer, filename: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/url.ts:5:export async function extractUrl(url: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/types.ts:1:export interface ExtractionResult {

---

## API Inventory (auto-generated 2026-03-11 08:43 UTC)

### TypeScript / JavaScript public exports
./prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/e2e/api-mocks.ts:15:export async function mockAiRoutes(page: Page): Promise<void> {
./.worktrees/feat-playback-persistence/src/middleware.ts:34:export default function middleware(request: NextRequest, event: NextFetchEvent) {
./.worktrees/feat-playback-persistence/src/middleware.ts:41:export const config = {
./.worktrees/feat-playback-persistence/src/app/pocket/BookmarkletLink.tsx:7:export function BookmarkletLink({ href }: BookmarkletLinkProps) {
./.worktrees/feat-playback-persistence/src/app/pocket/page.tsx:9:export default function PocketPage() {
./.worktrees/feat-playback-persistence/src/app/sign-up/[[...sign-up]]/page.tsx:3:export default function SignUpPage() {
./.worktrees/feat-playback-persistence/src/app/upgrade/page.tsx:4:export default function UpgradePage() {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:9:export const metadata: Metadata = {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:16:export default function RootLayout({ children }: { children: React.ReactNode }) {
./.worktrees/feat-playback-persistence/src/app/api/webhook/route.ts:5:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:8:export const maxDuration = 60;
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:12:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/save/route.ts:7:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/create-checkout-session/route.ts:6:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/library/route.ts:16:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:15:export const maxDuration = 180;
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:17:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/audio/[id]/route.ts:6:export async function GET(
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:5:export async function POST(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:38:export async function GET(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/me/route.ts:3:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/upload/route.ts:11:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:11:export const maxDuration = 120;
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:13:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/sign-in/[[...sign-in]]/page.tsx:3:export default function SignInPage() {
./.worktrees/feat-playback-persistence/src/app/save/page.tsx:84:export default function SavePage() {
./.worktrees/feat-playback-persistence/src/app/page.tsx:3:export default function Home() {
./.worktrees/feat-playback-persistence/src/components/UploadScreen.tsx:19:export function UploadScreen({ onProcess, onImportPocket }: UploadScreenProps) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:5:export const SMART_RESUME_REWIND_SECS = 3;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:6:export const SMART_RESUME_THRESHOLD_MS = 10_000;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:8:export interface PlayableItem {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:32:export function PlayerProvider({ children }: { children: ReactNode }) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:210:export function usePlayer() {
./.worktrees/feat-playback-persistence/src/components/PlayerBar.tsx:10:export function PlayerBar({ onExpand }: PlayerBarProps) {
./.worktrees/feat-playback-persistence/src/components/LibraryScreen.tsx:46:export function LibraryScreen({ visible }: LibraryScreenProps) {
./.worktrees/feat-playback-persistence/src/components/BottomNav.tsx:56:export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
./.worktrees/feat-playback-persistence/src/components/AppShell.tsx:16:export function AppShell() {
./.worktrees/feat-playback-persistence/src/components/ProcessingScreen.tsx:51:export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
./.worktrees/feat-playback-persistence/src/components/ExpandedPlayer.tsx:14:export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:16:export function SettingsScreen({ onClose }: { onClose: () => void }) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:102:export function useElevenLabsKey(): string | null {
./.worktrees/feat-playback-persistence/src/components/PocketImportScreen.tsx:15:export function PocketImportScreen({ onComplete }: PocketImportScreenProps) {
./.worktrees/feat-playback-persistence/src/components/CarMode.tsx:9:export function CarMode({ onExit }: CarModeProps) {
./.worktrees/feat-playback-persistence/src/components/HomeScreen.tsx:23:export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
./.worktrees/feat-playback-persistence/src/hooks/useCommuteDuration.ts:21:export function useCommuteDuration() {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:8:export function getStripeClient(): Stripe {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:17:export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:1:export interface ScriptSegment {
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:6:export function parseConversationScript(script: string): ScriptSegment[] {
./.worktrees/feat-playback-persistence/src/lib/utils/retry.ts:10:export async function retryWithBackoff<T>(
./.worktrees/feat-playback-persistence/src/lib/utils/hash.ts:3:export function contentHash(text: string): string {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:1:export const WORDS_PER_MINUTE = 150;
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:3:export function minutesToWords(minutes: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:7:export function wordsToMinutes(words: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:11:export function formatDuration(totalSeconds: number): string {
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:26:export async function uploadAudio(
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:45:export function isBlobStorageConfigured(): boolean {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:1:export interface ContentAnalysis {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:8:export interface ScriptConfig {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:15:export interface GeneratedScript {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:21:export interface AIProvider {
./.worktrees/feat-playback-persistence/src/lib/ai/claude.ts:34:export class ClaudeProvider implements AIProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/elevenlabs.ts:5:export class ElevenLabsTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/narrator.ts:23:export async function generateNarratorAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/openai.ts:5:export class OpenAITTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/chunk.ts:11:export function chunkText(text: string): string[] {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:1:export interface VoiceConfig {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:6:export interface TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/google.ts:5:export class GoogleCloudTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:53:export interface ConversationAudioResult {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:58:export async function generateConversationAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/provider.ts:6:export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:9:export function isByokInstance(): boolean {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:21:export async function hasActiveSubscription(userId: string): Promise<boolean> {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:36:export async function requireSubscription(userId: string): Promise<NextResponse | null> {
./.worktrees/feat-playback-persistence/src/lib/extractors/epub.ts:4:export async function extractEpub(buffer: Buffer, filename: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/url.ts:5:export async function extractUrl(url: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/types.ts:1:export interface ExtractionResult {

---

## API Inventory (auto-generated 2026-03-11 09:52 UTC)

### TypeScript / JavaScript public exports
./prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/prisma/seed.ts:11:export async function seed(injectedPrisma?: PrismaClient) {
./.worktrees/feat-playback-persistence/e2e/api-mocks.ts:15:export async function mockAiRoutes(page: Page): Promise<void> {
./.worktrees/feat-playback-persistence/src/middleware.ts:34:export default function middleware(request: NextRequest, event: NextFetchEvent) {
./.worktrees/feat-playback-persistence/src/middleware.ts:41:export const config = {
./.worktrees/feat-playback-persistence/src/app/pocket/BookmarkletLink.tsx:7:export function BookmarkletLink({ href }: BookmarkletLinkProps) {
./.worktrees/feat-playback-persistence/src/app/pocket/page.tsx:9:export default function PocketPage() {
./.worktrees/feat-playback-persistence/src/app/sign-up/[[...sign-up]]/page.tsx:3:export default function SignUpPage() {
./.worktrees/feat-playback-persistence/src/app/upgrade/page.tsx:4:export default function UpgradePage() {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:9:export const metadata: Metadata = {
./.worktrees/feat-playback-persistence/src/app/layout.tsx:16:export default function RootLayout({ children }: { children: React.ReactNode }) {
./.worktrees/feat-playback-persistence/src/app/api/webhook/route.ts:5:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:8:export const maxDuration = 60;
./.worktrees/feat-playback-persistence/src/app/api/pocket/import/route.ts:12:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/pocket/save/route.ts:7:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/create-checkout-session/route.ts:6:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/library/route.ts:16:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:15:export const maxDuration = 180;
./.worktrees/feat-playback-persistence/src/app/api/audio/generate/route.ts:17:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/audio/[id]/route.ts:6:export async function GET(
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:5:export async function POST(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/playback/route.ts:38:export async function GET(request: NextRequest) {
./.worktrees/feat-playback-persistence/src/app/api/me/route.ts:3:export async function GET() {
./.worktrees/feat-playback-persistence/src/app/api/upload/route.ts:11:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:11:export const maxDuration = 120;
./.worktrees/feat-playback-persistence/src/app/api/process/route.ts:13:export async function POST(request: Request) {
./.worktrees/feat-playback-persistence/src/app/sign-in/[[...sign-in]]/page.tsx:3:export default function SignInPage() {
./.worktrees/feat-playback-persistence/src/app/save/page.tsx:84:export default function SavePage() {
./.worktrees/feat-playback-persistence/src/app/page.tsx:3:export default function Home() {
./.worktrees/feat-playback-persistence/src/components/UploadScreen.tsx:19:export function UploadScreen({ onProcess, onImportPocket }: UploadScreenProps) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:5:export const SMART_RESUME_REWIND_SECS = 3;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:6:export const SMART_RESUME_THRESHOLD_MS = 10_000;
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:8:export interface PlayableItem {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:32:export function PlayerProvider({ children }: { children: ReactNode }) {
./.worktrees/feat-playback-persistence/src/components/PlayerContext.tsx:210:export function usePlayer() {
./.worktrees/feat-playback-persistence/src/components/PlayerBar.tsx:10:export function PlayerBar({ onExpand }: PlayerBarProps) {
./.worktrees/feat-playback-persistence/src/components/LibraryScreen.tsx:46:export function LibraryScreen({ visible }: LibraryScreenProps) {
./.worktrees/feat-playback-persistence/src/components/BottomNav.tsx:56:export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
./.worktrees/feat-playback-persistence/src/components/AppShell.tsx:16:export function AppShell() {
./.worktrees/feat-playback-persistence/src/components/ProcessingScreen.tsx:51:export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
./.worktrees/feat-playback-persistence/src/components/ExpandedPlayer.tsx:14:export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:16:export function SettingsScreen({ onClose }: { onClose: () => void }) {
./.worktrees/feat-playback-persistence/src/components/SettingsScreen.tsx:102:export function useElevenLabsKey(): string | null {
./.worktrees/feat-playback-persistence/src/components/PocketImportScreen.tsx:15:export function PocketImportScreen({ onComplete }: PocketImportScreenProps) {
./.worktrees/feat-playback-persistence/src/components/CarMode.tsx:9:export function CarMode({ onExit }: CarModeProps) {
./.worktrees/feat-playback-persistence/src/components/HomeScreen.tsx:23:export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
./.worktrees/feat-playback-persistence/src/hooks/useCommuteDuration.ts:21:export function useCommuteDuration() {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:8:export function getStripeClient(): Stripe {
./.worktrees/feat-playback-persistence/src/lib/stripe.ts:17:export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:1:export interface ScriptSegment {
./.worktrees/feat-playback-persistence/src/lib/utils/script-parser.ts:6:export function parseConversationScript(script: string): ScriptSegment[] {
./.worktrees/feat-playback-persistence/src/lib/utils/retry.ts:10:export async function retryWithBackoff<T>(
./.worktrees/feat-playback-persistence/src/lib/utils/hash.ts:3:export function contentHash(text: string): string {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:1:export const WORDS_PER_MINUTE = 150;
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:3:export function minutesToWords(minutes: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:7:export function wordsToMinutes(words: number): number {
./.worktrees/feat-playback-persistence/src/lib/utils/duration.ts:11:export function formatDuration(totalSeconds: number): string {
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:26:export async function uploadAudio(
./.worktrees/feat-playback-persistence/src/lib/storage/blob.ts:45:export function isBlobStorageConfigured(): boolean {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:1:export interface ContentAnalysis {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:8:export interface ScriptConfig {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:15:export interface GeneratedScript {
./.worktrees/feat-playback-persistence/src/lib/ai/types.ts:21:export interface AIProvider {
./.worktrees/feat-playback-persistence/src/lib/ai/claude.ts:34:export class ClaudeProvider implements AIProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/elevenlabs.ts:5:export class ElevenLabsTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/narrator.ts:23:export async function generateNarratorAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/openai.ts:5:export class OpenAITTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/chunk.ts:11:export function chunkText(text: string): string[] {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:1:export interface VoiceConfig {
./.worktrees/feat-playback-persistence/src/lib/tts/types.ts:6:export interface TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/google.ts:5:export class GoogleCloudTTSProvider implements TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:53:export interface ConversationAudioResult {
./.worktrees/feat-playback-persistence/src/lib/tts/conversation.ts:58:export async function generateConversationAudio(
./.worktrees/feat-playback-persistence/src/lib/tts/provider.ts:6:export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:9:export function isByokInstance(): boolean {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:21:export async function hasActiveSubscription(userId: string): Promise<boolean> {
./.worktrees/feat-playback-persistence/src/lib/subscription.ts:36:export async function requireSubscription(userId: string): Promise<NextResponse | null> {
./.worktrees/feat-playback-persistence/src/lib/extractors/epub.ts:4:export async function extractEpub(buffer: Buffer, filename: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/url.ts:5:export async function extractUrl(url: string): Promise<ExtractionResult> {
./.worktrees/feat-playback-persistence/src/lib/extractors/types.ts:1:export interface ExtractionResult {

---
