<template>
	<div class="flex min-h-screen bg-slate-50 text-slate-900">
		<AppSidebar />

		<div class="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
			<main class="flex-1 overflow-y-auto">
				<slot />
			</main>

			<AppBottomBar class="md:hidden" />
		</div>
	</div>

	<UToaster />
</template>
