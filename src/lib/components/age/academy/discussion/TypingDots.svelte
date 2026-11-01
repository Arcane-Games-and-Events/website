<!-- Three dots that bounce in turn: someone is typing. Still for reduced motion. -->
<span class="typing-dots inline-flex items-end gap-[3px]" aria-hidden="true"
	><span></span><span></span><span></span></span
>

<style>
	.typing-dots span {
		width: 5px;
		height: 5px;
		background: currentColor;
		animation: dot 1.2s ease-in-out infinite;
	}
	.typing-dots span:nth-child(2) {
		animation-delay: 0.15s;
	}
	.typing-dots span:nth-child(3) {
		animation-delay: 0.3s;
	}
	@keyframes dot {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.45;
		}
		30% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.typing-dots span {
			animation: none;
			opacity: 0.7;
		}
	}
</style>
