<template>
	<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div
			v-if="$slots.toolbar"
			class="border-b border-slate-200 px-5 py-4"
		>
			<slot name="toolbar" />
		</div>

		<div class="min-h-[320px]">
			<slot />
		</div>

		<div
			v-if="$slots.footer"
			class="border-t border-slate-200 px-5 py-4"
		>
			<slot name="footer" />
		</div>
	</section>
</template>
