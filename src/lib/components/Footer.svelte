<script>
	const currentYear = new Date().getFullYear();
</script>

<footer class="mt-24 border-t border-white/10 bg-gray-900/30">
	<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex min-h-11 flex-col items-center justify-between gap-4 sm:flex-row">
			<!-- Left: Brand & Copyright -->
			<div class="flex items-center gap-4">
				<a href="/">
					<img src="/logo.svg" alt="AGE" class="h-6 w-auto" />
				</a>
				<span class="text-xs text-gray-500">&copy; {currentYear} AGE Software</span>
			</div>

			<!-- Right: Links -->
			<div class="flex items-center gap-6">
				<a href="/privacy" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy</a>
				<a href="/terms" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms</a>
				<span class="hidden sm:inline text-xs text-gray-600">Flesh and Blood is a trademark of Legend Story Studios</span>
			</div>
		</div>
	</div>
</footer>
