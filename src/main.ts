import { Plugin } from 'obsidian';
import { CodeblockModeRenderer } from './codeblock_mode';

/**
 * 诗词/古文渲染插件
 * 支持 poetry（诗歌）和 lc（古文）代码块
 * 支持拼音标注（**字pīnyīn**）和双下划线注释（==文本|注释==）
 */
export default class PoemPlugin extends Plugin {
	// 代码块类型配置映射
	private readonly BLOCK_CONFIG = {
		poetry: 'poetry-line',
		lc: 'lc-line',
		LC: 'lc-line',
	} as const;

	// 初始化代码块渲染器
	private renderer: CodeblockModeRenderer = new CodeblockModeRenderer();

	async onload(): Promise<void> {
		// 代码块渲染器注册
		Object.entries(this.BLOCK_CONFIG).forEach(([blockType, lineClass]) => {
			this.registerMarkdownCodeBlockProcessor(
				blockType,
				(source, el, ctx) => {
					this.renderer.handleCodeBlockRendering(
						lineClass,
						source,
						el,
						ctx,
					);
				},
			);
		});
	}
}
