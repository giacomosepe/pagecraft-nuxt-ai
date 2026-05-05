import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const TOKEN_RE = /\{\{\s*[^}]+?\s*\}\}/g;

export const VariableTokenHighlight = Extension.create({
	name: "variableTokenHighlight",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					decorations(state) {
						const decorations: Decoration[] = [];

						state.doc.descendants((node, pos) => {
							if (!node.isText || !node.text) return;

							for (const match of node.text.matchAll(TOKEN_RE)) {
								const start = pos + (match.index ?? 0);
								const end = start + match[0].length;
								decorations.push(
									Decoration.inline(start, end, {
										class: "variable-token-highlight",
										"data-variable-token": "true",
										contenteditable: "false",
										spellcheck: "false",
										title: "Variabile del template",
									}),
								);
							}
						});

						return DecorationSet.create(state.doc, decorations);
					},
				},
			}),
		];
	},
});
