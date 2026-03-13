# API Inventory

> Auto-generated 2026-03-13 07:41 UTC — overwritten each session. Do not edit.

## TypeScript / JavaScript public exports

./native/app/settings.tsx:56:export default function SettingsScreen() {
./native/app/(tabs)/index.tsx:163:export default function HomeScreen() {
./native/app/(tabs)/library.tsx:40:export default function LibraryScreen() {
./native/app/(tabs)/_layout.tsx:4:export default function TabLayout() {
./native/app/+not-found.tsx:4:export default function NotFoundScreen() {
./native/app/sign-in.tsx:11:export default function SignInScreen() {
./native/app/_layout.tsx:82:export default function RootLayout() {
./native/app/processing.tsx:98:export default function ProcessingScreen() {
./native/app/+html.tsx:7:export default function Root({ children }: { children: React.ReactNode }) {
./native/components/SkeletonList.tsx:9:export default function SkeletonList({ count = 5 }: SkeletonListProps) {
./native/components/PlayerBar.tsx:10:export default function PlayerBar() {
./native/components/OfflineBanner.tsx:12:export default function OfflineBanner() {
./native/components/DurationPicker.tsx:14:export function findActivePreset(
./native/components/DurationPicker.tsx:33:export default function DurationPicker({ value, onChange }: DurationPickerProps) {
./native/components/EpisodeCard.tsx:49:export interface EpisodeCardProps {
./native/components/EpisodeCard.tsx:66:export default function EpisodeCard({
./native/components/ExpandedPlayer.tsx:63:export default function ExpandedPlayer({ visible, onDismiss }: ExpandedPlayerProps) {
./native/components/ShimmerCard.tsx:5:export default function ShimmerCard() {
./native/components/CarMode.tsx:13:export default function CarMode({ visible, onDismiss }: CarModeProps) {
./native/components/SourceIcon.tsx:22:export default function SourceIcon({
./native/components/empty-states/AllCaughtUpEmptyState.tsx:203:export default function AllCaughtUpEmptyState({
./native/components/empty-states/NewUserEmptyState.tsx:128:export default function NewUserEmptyState({ onCreateEpisode }: NewUserEmptyStateProps) {
./native/components/empty-states/StaleLibraryNudge.tsx:21:export default function StaleLibraryNudge({
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
./native/lib/utils.ts:110:export function sourceName(
./native/lib/utils.ts:138:export function timeRemaining(positionSecs: number, durationSecs: number): string {
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
./native/lib/types.ts:117:export type LibraryFilter = "active" | "all" | "in_progress" | "completed" | "generating";
./native/lib/sourceUtils.ts:47:export function extractDomain(url: string): string | null {
./native/lib/sourceUtils.ts:60:export function hslToHex(h: number, s: number, l: number): string {
./native/lib/sourceUtils.ts:75:export function hashColor(str: string): string {
./native/lib/sourceUtils.ts:92:export function toTitleCase(str: string): string {
./native/lib/sourceUtils.ts:111:export interface SourceIdentity {
./native/lib/sourceUtils.ts:123:export function deriveSourceIdentity(item: {
./native/lib/libraryHelpers.ts:11:export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
./native/lib/libraryHelpers.ts:23:export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
./native/lib/libraryHelpers.ts:49:export function filterEpisodes(
./native/lib/libraryHelpers.ts:189:export function smartTitle(
./native/lib/libraryHelpers.ts:223:export type LibraryContext =
./native/lib/libraryHelpers.ts:233:export function getLibraryContext(items: LibraryItem[]): LibraryContext {
./native/lib/libraryHelpers.ts:255:export function getTopSourceDomain(items: LibraryItem[]): string | null {
./native/lib/constants.ts:5:export const SMART_RESUME_REWIND_SECS = 3;
./native/lib/constants.ts:6:export const CAR_MODE_SKIP_SECS = 30; // Larger skip interval for eyes-off driving
./native/lib/constants.ts:7:export const SMART_RESUME_THRESHOLD_MS = 10_000;

---
