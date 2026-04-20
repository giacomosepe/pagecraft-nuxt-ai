<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		size?: "md" | "lg" | "xl" | "full";
		padded?: boolean;
	}>(),
	{
		size: "xl",
		padded: true,
	},
);

const sizeClasses: Record<NonNullable<typeof props.size>, string> = {
	md: "max-w-4xl",
	lg: "max-w-5xl",
	xl: "max-w-6xl",
	full: "max-w-7xl",
};
</script>

<template>
	<section
		class="mx-auto w-full"
		:class="[
			sizeClasses[props.size],
			props.padded ? 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8' : '',
		]"
	>
		<slot />
	</section>
</template>
