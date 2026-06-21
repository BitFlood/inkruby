import { MarkdownPostProcessorContext } from 'obsidian';

/**
 * 处理代码块渲染的核心类。
 * 负责将特定格式的文本（如诗歌/古文）解析为结构化的HTML视图，
 * 支持拼音标注和双下划线注释。
 */
export class CodeblockModeRenderer {
	// 满足渲染要求的最小行数（标题 + 作者）
	private static readonly MIN_CONTENT_LINES = 2;

	/**
	 * 代码块渲染的入口方法
	 * @param lineClass CSS行类名，用于区分诗歌/古文样式
	 * @param source 代码块的原始文本内容
	 * @param container 渲染内容的HTML容器
	 * @param context Markdown渲染上下文（此处未直接使用，保留以便扩展）
	 */
	public handleCodeBlockRendering(
		lineClass: string,
		source: string,
		container: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		// 提取并清洗代码块的行内容
		const lines = this.extractCodeBlockLines(source);

		// 检查是否有足够的内容行（至少标题和作者两行）
		if (this.isValidContentLength(lines)) {
			// 渲染完整的结构化视图
			this.renderStructuredView(lineClass, lines, container);
		} else {
			// 内容不足时显示原始文本
			this.displayRawSource(source, container);
		}
	}

	/**
	 * 提取并清洗代码块内容
	 * @param source 原始字符串
	 * @returns 去除首尾空格并按行分割的字符串数组，每行也已去除首尾空白
	 */
	private extractCodeBlockLines(source: string): string[] {
		return source
			.trim()
			.split('\n')
			.map((line) => line.trim());
	}

	/**
	 * 验证代码块内容是否满足最小渲染要求
	 * @param lines 分割后的文本行数组
	 * @returns 是否至少有两行有效内容（标题和作者）
	 */
	private isValidContentLength(lines: string[]): boolean {
		return lines.length >= CodeblockModeRenderer.MIN_CONTENT_LINES;
	}

	/**
	 * 渲染结构化的诗词/古文内容
	 * @param lineClass 正文行使用的CSS类名
	 * @param lines 文本行数组
	 * @param container 外层容器
	 */
	private renderStructuredView(
		lineClass: string,
		lines: string[],
		container: HTMLElement,
	): void {
		// 创建主容器div
		const contentContainer = this.createContentContainer(container);

		// 渲染标题和作者部分
		this.renderTitleAndAuthorSections(lines, contentContainer);
		// 渲染正文部分（包含拼音标注和双下划线注释）
		this.renderContentBody(lineClass, lines, contentContainer);
	}

	/**
	 * 创建包裹所有内容的最外层容器
	 * @param parent 父级HTML元素
	 * @returns 新创建的容器元素（类名为 container）
	 */
	private createContentContainer(parent: HTMLElement): HTMLElement {
		return parent.createDiv({ cls: 'container' });
	}

	/**
	 * 渲染标题（第一行）和作者（第二行）
	 * @param lines 文本行数组
	 * @param container 内容容器
	 */
	private renderTitleAndAuthorSections(
		lines: string[],
		container: HTMLElement,
	): void {
		// 第一行作为标题
		this.createTextContainer(container, 'title', lines[0] || '');
		// 第二行作为作者
		this.createTextContainer(container, 'author', lines[1] || '');
	}

	/**
	 * 渲染正文内容行（从第三行开始）
	 * @param lineClass 行元素的CSS类名
	 * @param lines 文本行数组
	 * @param container 内容容器
	 */
	private renderContentBody(
		lineClass: string,
		lines: string[],
		container: HTMLElement,
	): void {
		// 创建专门用于存放正文的区域容器
		const contentArea = container.createDiv({ cls: 'content' });

		// 从索引2开始遍历（跳过标题和作者）
		for (let i = 2; i < lines.length; i++) {
			const line = lines[i];
			// 仅当该行不为空时才渲染
			if (this.isNotEmptyLine(line || '')) {
				// 创建行容器
				const lineElement = contentArea.createDiv({ cls: lineClass });

				// 1. HTML转义，防止XSS
				let safeText = this.escapeHtml(line || '');

				// 2. 将 **字pīnyīn** 转换为 <ruby>字<rt>pīnyīn</rt></ruby>
				let processedHtml = this.convertPinyinAnnotations(safeText);

				// 3. 将 ==文本|注释== 转换为带悬浮提示的元素
				processedHtml = this.convertUnderlineAnnotations(processedHtml);

				// 设置处理后的HTML内容（已保证安全）
				this.setSafeInnerHTML(lineElement, processedHtml);
			}
		}
	}

	/**
	 * HTML特殊字符转义，防止XSS攻击
	 * @param text 原始文本
	 * @returns 转义后的安全文本
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * 转换拼音标注：**字pīnyīn** → <ruby>字<rt>pīnyīn</rt></ruby>
	 * 正则匹配单个汉字后跟字母和数字的拼音组合。
	 * @param text 已转义的安全文本
	 * @returns 处理后的HTML字符串
	 */
	private convertPinyinAnnotations(text: string): string {
		const pinyinRegex =
			/\*\*([\u4e00-\u9fa5])([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF0-9]+?)\*\*/g;
		return text.replace(
			pinyinRegex,
			(_, char, pinyin) => `<ruby>${char}<rt>${pinyin}</rt></ruby>`,
		);
	}

	/**
	 * 转换双下划线标注：==文本|注释== → <span class="double-underline" title="注释">文本</span>
	 * 注意：原设计未对注释内容再次转义（因外层文本已转义，但注释中的特殊字符仍可能被解析）。
	 * 若需增强安全性，可取消下一行的转义注释。
	 * @param html 已处理过拼音标注的HTML字符串
	 * @returns 处理后的HTML字符串
	 */
	private convertUnderlineAnnotations(html: string): string {
		const underlineRegex = /==([\s\S]*?)\|([\s\S]*?)==/g;
		return html.replace(underlineRegex, (_, text, note) => {
			// const escapedNote = this.escapeHtml(note || ''); // 可选的安全增强
			return `<span class="double-underline" title="${note}">${text}</span>`;
		});
	}

	/**
	 * 安全地设置元素的 innerHTML
	 * 调用前已确保 html 字符串已经过转义或严格构造
	 * @param element 目标DOM元素
	 * @param html 安全的HTML字符串
	 */
	private setSafeInnerHTML(element: HTMLElement, html: string): void {
		// 已经过 escapeHtml 处理，所以是安全的
		// eslint-disable-next-line no-unsafe-innerhtml/no-unsafe-innerhtml
		element.innerHTML = html;
	}

	/**
	 * 检查字符串是否为非空行
	 * @param line 输入的字符串
	 * @returns 是否为非空字符串（含有至少一个字符）
	 */
	private isNotEmptyLine(line: string): boolean {
		return Boolean(line && line.length > 0);
	}

	/**
	 * 创建文本容器的辅助函数
	 * @param parent 父级元素
	 * @param className 应用的CSS类名
	 * @param text 显示的文本内容（纯文本）
	 */
	private createTextContainer(
		parent: HTMLElement,
		className: string,
		text: string,
	): void {
		parent.createEl('div', { cls: className, text: text || '' });
	}

	/**
	 * 当内容不足时，直接显示原始代码块文本
	 * @param source 原始文本
	 * @param container 父级容器
	 */
	private displayRawSource(source: string, container: HTMLElement): void {
		container.createEl('pre', { text: source });
	}
}
