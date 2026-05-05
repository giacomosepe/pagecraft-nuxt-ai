<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { VariableTokenHighlight } from "~/utils/tiptapVariableTokens";
import { normalizeToRichHtml } from "~/utils/richText";

const props = withDefaults(defineProps<{
	modelValue: string;
	minHeightClass?: string;
}>(), {
	minHeightClass: "min-h-[420px]",
});

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

let isApplyingExternalUpdate = false;

const editor = useEditor({
	content: normalizeToRichHtml(props.modelValue),
	extensions: [
		StarterKit.configure({
			blockquote: false,
			codeBlock: false,
			heading: false,
			horizontalRule: false,
		}),
		VariableTokenHighlight,
	],
	editorProps: {
		attributes: {
			class:
				"rich-text-editable px-5 py-4 text-justify text-[12px] leading-7 text-slate-700 outline-none",
		},
	},
	onUpdate: ({ editor }) => {
		if (isApplyingExternalUpdate) return;
		emit("update:modelValue", editor.getHTML());
	},
});

watch(
	() => props.modelValue,
	(value) => {
		if (!editor.value) return;
		const nextHtml = normalizeToRichHtml(value);
		if (editor.value.getHTML() === nextHtml) return;

		isApplyingExternalUpdate = true;
		editor.value.commands.setContent(nextHtml);
		isApplyingExternalUpdate = false;
	},
);

onBeforeUnmount(() => {
	editor.value?.destroy();
});
</script>

<template>
	<div class="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
		<div class="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				icon="i-lucide-bold"
				class="rounded-lg"
				:class="{ 'bg-white text-slate-950 shadow-sm': editor?.isActive('bold') }"
				:disabled="!editor"
				aria-label="Grassetto"
				@click="editor?.chain().focus().toggleBold().run()"
			/>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				icon="i-lucide-italic"
				class="rounded-lg"
				:class="{ 'bg-white text-slate-950 shadow-sm': editor?.isActive('italic') }"
				:disabled="!editor"
				aria-label="Corsivo"
				@click="editor?.chain().focus().toggleItalic().run()"
			/>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				icon="i-lucide-list"
				class="rounded-lg"
				:class="{ 'bg-white text-slate-950 shadow-sm': editor?.isActive('bulletList') }"
				:disabled="!editor"
				aria-label="Elenco puntato"
				@click="editor?.chain().focus().toggleBulletList().run()"
			/>
		</div>

		<EditorContent
			:editor="editor"
			class="rich-text-editor bg-white"
			:class="minHeightClass"
		/>
	</div>
</template>

<style scoped>
.rich-text-editor :deep(.ProseMirror) {
	min-height: inherit;
}

.rich-text-editor :deep(.ProseMirror p) {
	margin: 0 0 1rem;
}

.rich-text-editor :deep(.ProseMirror ul) {
	margin: 0 0 1rem 1.25rem;
	list-style: disc;
}

.rich-text-editor :deep(.ProseMirror li) {
	margin: 0.25rem 0;
}

.rich-text-editor :deep(.variable-token-highlight) {
	border-radius: 0.375rem;
	background: rgb(245 243 255);
	padding: 0.125rem 0.25rem;
	color: rgb(109 40 217);
	font-weight: 600;
	cursor: default;
	user-select: all;
	box-shadow: inset 0 0 0 1px rgb(221 214 254);
}
</style>
