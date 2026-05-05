<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { VariableTokenHighlight } from "~/utils/tiptapVariableTokens";
import { normalizeToRichHtml } from "~/utils/richText";

const props = withDefaults(defineProps<{
	title: string;
	content: string;
	confirmLabel?: string;
	onConfirm: (content: string) => void;
	onCancel: () => void;
}>(), {
	confirmLabel: "Salva",
});

const editor = useEditor({
	content: normalizeToRichHtml(props.content),
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
				"min-h-[420px] max-h-[58vh] overflow-y-auto px-5 py-4 text-justify text-[12px] leading-7 text-slate-700 outline-none",
		},
	},
});

const canSave = computed(() => Boolean(editor.value));

function confirm(): void {
	const value = editor.value?.getHTML() ?? "";
	props.onConfirm(value);
}
</script>

<template>
	<UModal :open="true" :ui="{ content: 'max-w-[min(1040px,calc(100vw-32px))]' }">
		<template #content>
			<div class="flex max-h-[82vh] flex-col bg-white">
				<div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
							Editor documento
						</p>
						<h2 class="text-sm font-semibold text-slate-950">
							{{ title }}
						</h2>
					</div>
					<UButton
						variant="ghost"
						color="neutral"
						size="sm"
						icon="i-lucide-x"
						class="rounded-xl"
						@click="onCancel"
					/>
				</div>

				<div class="flex items-center gap-1 border-b border-slate-200 px-5 py-3">
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						icon="i-lucide-bold"
						class="rounded-lg"
						:class="{ 'bg-slate-100 text-slate-950': editor?.isActive('bold') }"
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
						:class="{ 'bg-slate-100 text-slate-950': editor?.isActive('italic') }"
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
						:class="{ 'bg-slate-100 text-slate-950': editor?.isActive('bulletList') }"
						:disabled="!editor"
						aria-label="Elenco puntato"
						@click="editor?.chain().focus().toggleBulletList().run()"
					/>
				</div>

				<div class="flex-1 overflow-hidden bg-white">
					<EditorContent
						:editor="editor"
						class="rich-text-editor"
					/>
				</div>

				<div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						class="rounded-xl"
						@click="onCancel"
					>
						Annulla
					</UButton>
					<UButton
						size="sm"
						class="rounded-xl"
						:disabled="!canSave"
						@click="confirm"
					>
						{{ confirmLabel }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
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
