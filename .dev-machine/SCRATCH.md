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

## API Inventory (auto-generated 2026-03-11 16:07 UTC)

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

## API Inventory (auto-generated 2026-03-11 17:54 UTC)

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

## API Inventory (auto-generated 2026-03-12 23:48 UTC)

### TypeScript / JavaScript public exports
./native/app/settings.tsx:56:export default function SettingsScreen() {
./native/app/(tabs)/index.tsx:166:export default function HomeScreen() {
./native/app/(tabs)/library.tsx:31:export default function LibraryScreen() {
./native/app/(tabs)/_layout.tsx:4:export default function TabLayout() {
./native/app/+not-found.tsx:4:export default function NotFoundScreen() {
./native/app/sign-in.tsx:11:export default function SignInScreen() {
./native/app/_layout.tsx:82:export default function RootLayout() {
./native/app/processing.tsx:98:export default function ProcessingScreen() {
./native/app/+html.tsx:7:export default function Root({ children }: { children: React.ReactNode }) {
./native/components/PlayerBar.tsx:6:export default function PlayerBar() {
./native/components/OfflineBanner.tsx:12:export default function OfflineBanner() {
./native/components/DurationPicker.tsx:14:export function findActivePreset(
./native/components/DurationPicker.tsx:33:export default function DurationPicker({ value, onChange }: DurationPickerProps) {
./native/components/EpisodeCard.tsx:25:export interface EpisodeCardProps {
./native/components/EpisodeCard.tsx:40:export default function EpisodeCard({
./native/components/ExpandedPlayer.tsx:62:export default function ExpandedPlayer({ visible, onDismiss }: ExpandedPlayerProps) {
./native/components/CarMode.tsx:13:export default function CarMode({ visible, onDismiss }: CarModeProps) {
./native/components/EmptyState.tsx:5:export interface EmptyStateProps {
./native/components/EmptyState.tsx:13:export default function EmptyState({
./native/components/NewVersionSheet.tsx:14:export interface NewVersionSheetProps {
./native/components/NewVersionSheet.tsx:20:export default function NewVersionSheet({
./native/components/UploadModal.tsx:32:export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
./native/lib/carplay.ts:21:export async function initializeCarPlay(): Promise<void> {
./native/lib/carplay.ts:114:export function isCarPlayAvailable(): boolean {
./native/lib/player.ts:8:export async function setupPlayer(): Promise<boolean> {
./native/lib/player.ts:44:export async function PlaybackService() {
./native/lib/utils.ts:9:export function nextSpeed(current: number, speeds: number[]): number {
./native/lib/utils.ts:24:export function formatDuration(secs: number): string {
./native/lib/utils.ts:52:export function estimateReadingTime(wordCount: number): number {
./native/lib/utils.ts:61:export function formatStorageSize(bytes: number): string {
./native/lib/utils.ts:68:export function formatDurationMinutes(secs: number): string {
./native/lib/utils.ts:86:export function timeAgo(dateString: string): string {
./native/lib/api.ts:12:export function setTokenProvider(fn: () => Promise<string | null>) {
./native/lib/api.ts:49:export async function uploadUrl(url: string): Promise<UploadResponse> {
./native/lib/api.ts:66:export async function uploadFile(
./native/lib/api.ts:93:export async function processContent(
./native/lib/api.ts:106:export async function generateAudio(
./native/lib/api.ts:122:export async function fetchLibrary(): Promise<LibraryItem[]> {
./native/lib/api.ts:128:export async function getPlaybackState(
./native/lib/api.ts:134:export async function savePlaybackState(state: {
./native/lib/downloads.ts:13:export async function downloadEpisodeAudio(
./native/lib/downloads.ts:38:export async function resolveAudioUrl(
./native/lib/downloads.ts:50:export async function deleteDownload(audioId: string): Promise<void> {
./native/lib/types.ts:3:export interface UploadResponse {
./native/lib/types.ts:18:export interface ProcessResponse {
./native/lib/types.ts:34:export interface GenerateResponse {
./native/lib/types.ts:45:export interface AudioVersion {
./native/lib/types.ts:65:export interface LibraryItem {
./native/lib/types.ts:76:export interface PlaybackState {
./native/lib/types.ts:88:export interface PlayableItem {
./native/lib/types.ts:108:export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
./native/lib/libraryHelpers.ts:11:export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
./native/lib/libraryHelpers.ts:23:export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
./native/lib/libraryHelpers.ts:45:export function filterEpisodes(
./native/lib/constants.ts:5:export const SMART_RESUME_REWIND_SECS = 3;
./native/lib/constants.ts:6:export const CAR_MODE_SKIP_SECS = 30; // Larger skip interval for eyes-off driving
./native/lib/constants.ts:7:export const SMART_RESUME_THRESHOLD_MS = 10_000;
./native/lib/constants.ts:8:export const POSITION_SAVE_INTERVAL_MS = 5_000;
./native/lib/constants.ts:9:export const TTS_WPM = 150;
./native/lib/constants.ts:10:export const READING_WPM = 250;
./native/lib/constants.ts:13:export const DURATION_PRESETS = [
./native/lib/constants.ts:21:export const DURATION_SLIDER = { min: 2, max: 60, step: 1 } as const;
./native/lib/constants.ts:24:export type ProcessingStage = "analyzing" | "scripting" | "generating" | "ready";
./native/lib/constants.ts:26:export const STAGE_COPY: Record<ProcessingStage, string | null> = {
./native/lib/constants.ts:34:export const STAGE_LABELS: {
./native/lib/constants.ts:48:export function getStageIndex(stage: ProcessingStage): number {
./native/lib/constants.ts:53:export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
./native/lib/usePlayer.ts:55:export function usePlayer() {
./native/lib/usePlayer.ts:79:export function PlayerProvider({ children }: { children: React.ReactNode }) {
./native/lib/db.ts:6:export async function getDb(): Promise<SQLite.SQLiteDatabase> {
./native/lib/db.ts:13:export function setDb(db: SQLite.SQLiteDatabase) {
./native/lib/db.ts:49:export async function upsertEpisodes(items: LibraryItem[]) {
./native/lib/db.ts:68:export async function getAllEpisodes(): Promise<LibraryItem[]> {
./native/lib/db.ts:93:export async function searchEpisodes(query: string): Promise<LibraryItem[]> {
./native/lib/db.ts:125:export async function getLocalPlayback(audioId: string): Promise<PlaybackState | null> {
./native/lib/db.ts:145:export async function saveLocalPlayback(state: {
./native/lib/db.ts:169:export async function getAllLocalPlayback(): Promise<PlaybackState[]> {
./native/lib/db.ts:190:export async function recordDownload(audioId: string, localPath: string, sizeBytes: number) {
./native/lib/db.ts:201:export async function getDownloadPath(audioId: string): Promise<string | null> {
./native/lib/db.ts:210:export async function getStorageInfo(): Promise<{ count: number; totalBytes: number }> {

---

## API Inventory (auto-generated 2026-03-13 00:18 UTC)

### TypeScript / JavaScript public exports
./native/app/settings.tsx:56:export default function SettingsScreen() {
./native/app/(tabs)/index.tsx:158:export default function HomeScreen() {
./native/app/(tabs)/library.tsx:34:export default function LibraryScreen() {
./native/app/(tabs)/_layout.tsx:4:export default function TabLayout() {
./native/app/+not-found.tsx:4:export default function NotFoundScreen() {
./native/app/sign-in.tsx:11:export default function SignInScreen() {
./native/app/_layout.tsx:82:export default function RootLayout() {
./native/app/processing.tsx:98:export default function ProcessingScreen() {
./native/app/+html.tsx:7:export default function Root({ children }: { children: React.ReactNode }) {
./native/components/PlayerBar.tsx:7:export default function PlayerBar() {
./native/components/OfflineBanner.tsx:12:export default function OfflineBanner() {
./native/components/DurationPicker.tsx:14:export function findActivePreset(
./native/components/DurationPicker.tsx:33:export default function DurationPicker({ value, onChange }: DurationPickerProps) {
./native/components/EpisodeCard.tsx:37:export interface EpisodeCardProps {
./native/components/EpisodeCard.tsx:54:export default function EpisodeCard({
./native/components/ExpandedPlayer.tsx:62:export default function ExpandedPlayer({ visible, onDismiss }: ExpandedPlayerProps) {
./native/components/CarMode.tsx:13:export default function CarMode({ visible, onDismiss }: CarModeProps) {
./native/components/SourceIcon.tsx:22:export default function SourceIcon({
./native/components/EmptyState.tsx:5:export interface EmptyStateProps {
./native/components/EmptyState.tsx:13:export default function EmptyState({
./native/components/NewVersionSheet.tsx:14:export interface NewVersionSheetProps {
./native/components/NewVersionSheet.tsx:20:export default function NewVersionSheet({
./native/components/UploadModal.tsx:52:export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
./native/hooks/useNetworkStatus.ts:4:export interface NetworkStatus {
./native/hooks/useNetworkStatus.ts:14:export function useNetworkStatus(): NetworkStatus {
./native/lib/toast.ts:3:export function showToast(message: string, title = "Ridecast"): void {
./native/lib/toast.ts:7:export function showGeneratingToast(): void {
./native/lib/carplay.ts:21:export async function initializeCarPlay(): Promise<void> {
./native/lib/carplay.ts:114:export function isCarPlayAvailable(): boolean {
./native/lib/player.ts:8:export async function setupPlayer(): Promise<boolean> {
./native/lib/player.ts:44:export async function PlaybackService() {
./native/lib/utils.ts:9:export function nextSpeed(current: number, speeds: number[]): number {
./native/lib/utils.ts:24:export function formatDuration(secs: number): string {
./native/lib/utils.ts:52:export function estimateReadingTime(wordCount: number): number {
./native/lib/utils.ts:61:export function formatStorageSize(bytes: number): string {
./native/lib/utils.ts:68:export function formatDurationMinutes(secs: number): string {
./native/lib/utils.ts:86:export function timeAgo(dateString: string): string {
./native/lib/api.ts:12:export function setTokenProvider(fn: () => Promise<string | null>) {
./native/lib/api.ts:49:export async function uploadUrl(url: string): Promise<UploadResponse> {
./native/lib/api.ts:66:export async function uploadFile(
./native/lib/api.ts:93:export async function processContent(
./native/lib/api.ts:106:export async function generateAudio(
./native/lib/api.ts:122:export async function fetchLibrary(): Promise<LibraryItem[]> {
./native/lib/api.ts:128:export async function getPlaybackState(
./native/lib/api.ts:134:export async function savePlaybackState(state: {
./native/lib/api.ts:149:export async function deleteEpisode(contentId: string): Promise<void> {
./native/lib/downloads.ts:13:export async function downloadEpisodeAudio(
./native/lib/downloads.ts:38:export async function resolveAudioUrl(
./native/lib/downloads.ts:50:export async function deleteDownload(audioId: string): Promise<void> {
./native/lib/types.ts:3:export interface UploadResponse {
./native/lib/types.ts:18:export interface ProcessResponse {
./native/lib/types.ts:34:export interface GenerateResponse {
./native/lib/types.ts:45:export interface AudioVersion {
./native/lib/types.ts:65:export interface LibraryItem {
./native/lib/types.ts:82:export interface PlaybackState {
./native/lib/types.ts:94:export interface PlayableItem {
./native/lib/types.ts:115:export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
./native/lib/sourceUtils.ts:47:export function extractDomain(url: string): string | null {
./native/lib/sourceUtils.ts:60:export function hslToHex(h: number, s: number, l: number): string {
./native/lib/sourceUtils.ts:75:export function hashColor(str: string): string {
./native/lib/sourceUtils.ts:92:export function toTitleCase(str: string): string {
./native/lib/sourceUtils.ts:111:export interface SourceIdentity {
./native/lib/sourceUtils.ts:123:export function deriveSourceIdentity(item: {
./native/lib/libraryHelpers.ts:11:export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
./native/lib/libraryHelpers.ts:23:export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
./native/lib/libraryHelpers.ts:47:export function filterEpisodes(
./native/lib/libraryHelpers.ts:177:export function smartTitle(
./native/lib/constants.ts:5:export const SMART_RESUME_REWIND_SECS = 3;
./native/lib/constants.ts:6:export const CAR_MODE_SKIP_SECS = 30; // Larger skip interval for eyes-off driving
./native/lib/constants.ts:7:export const SMART_RESUME_THRESHOLD_MS = 10_000;
./native/lib/constants.ts:8:export const POSITION_SAVE_INTERVAL_MS = 5_000;
./native/lib/constants.ts:9:export const TTS_WPM = 150;
./native/lib/constants.ts:10:export const READING_WPM = 250;
./native/lib/constants.ts:13:export const DURATION_PRESETS = [
./native/lib/constants.ts:21:export const DURATION_SLIDER = { min: 2, max: 60, step: 1 } as const;
./native/lib/constants.ts:24:export type ProcessingStage = "analyzing" | "scripting" | "generating" | "ready";
./native/lib/constants.ts:26:export const STAGE_COPY: Record<ProcessingStage, string | null> = {
./native/lib/constants.ts:34:export const STAGE_LABELS: {
./native/lib/constants.ts:48:export function getStageIndex(stage: ProcessingStage): number {
./native/lib/constants.ts:53:export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

---
