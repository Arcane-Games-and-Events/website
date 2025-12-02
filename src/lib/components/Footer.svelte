<script>
	const currentYear = new Date().getFullYear();
</script>

<footer class="border-t border-white/10 bg-gray-900/30">
	<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex min-h-11 flex-col items-center justify-between gap-4 sm:flex-row">
			<!-- Left: Brand & Copyright -->
			<div class="flex items-center gap-4">
				<a href="/">
					<img src="/logo.svg" alt="AGE" class="h-6 w-auto" />
				</a>
				<span class="text-xs text-gray-500">&copy; {currentYear} Arcane Games and Events LLC</span>
			</div>

			<!-- Right: Links -->
			<div class="flex items-center gap-6">
				<a href="/privacy" class="text-xs text-gray-500 transition-colors hover:text-gray-300"
					>Privacy</a
				>
				<a href="/terms" class="text-xs text-gray-500 transition-colors hover:text-gray-300"
					>Terms</a
				>
				<span class="hidden text-xs text-gray-600 sm:inline"
					>Flesh and Blood is a trademark of Legend Story Studios</span
				>
			</div>
		</div>
	</div>
</footer>
