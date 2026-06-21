import { MarkdownPostProcessorContext } from 'obsidian';
/**
 * 处理代码块渲染的核心方法
 * @param lineClass CSS行类名，用于区分诗歌/古文样式
 * @param source 代码块的原始文本内容
 * @param container 渲染内容的HTML容器
 * @param context Markdown渲染上下文
 */

export class CodeblockModeRenderer {
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
	 * @returns 去除首尾空格并按行分割的字符串数组
	 */
	private extractCodeBlockLines(source: string): string[] {
		return source
			.trim() // 去除首尾空白字符
			.split('\n') // 按换行符分割成数组
			.map((line) => line.trim()); // 去除每一行首尾的空白字符
	}

	/**
	 * 验证代码块内容是否满足最小渲染要求
	 * @param lines 分割后的文本行数组
	 * @returns 是否至少有两行有效内容（标题和作者）
	 */
	private isValidContentLength(lines: string[]): boolean {
		return lines.length >= 2;
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
		// 渲染正文部分（包含拼音标注功能）
		this.renderContentBody(lineClass, lines, contentContainer);
	}

	/**
	 * 创建包裹所有内容的最外层容器
	 * @param parent 父级HTML元素
	 * @returns 新创建的容器元素
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
		// 创建标题元素（使用数组第一项）
		this.createTextContainer(container, 'title', lines[0] || '');
		// 创建作者元素（使用数组第二项）
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

				let safeText = this.escapeHtml(line || '');

				// 处理拼音标注：将**字pīnyīn**转换为<ruby>字<rt>pīnyīn</rt></ruby>
				let processedHtml = this.convertPinyinAnnotations(safeText);
				// 处理双下划线标注：将==文本|注释==转换为带悬浮提示的元素
				processedHtml = this.convertUnderlineAnnotations(processedHtml);

				// 设置处理后的HTML内容
				this.setSafeInnerHTML(lineElement, processedHtml);
			}
		}
	}

	/**
	 * 转换拼音标注：**字pīnyīn** → <ruby>字<rt>pīnyīn</rt></ruby>
	 * @param text 原始文本
	 * @returns 处理后的HTML字符串
	 */
	private convertPinyinAnnotations(text: string): string {
		// 正则表达式匹配**字pīnyīn**格式（单个汉字+带声调拼音）
		const pinyinRegex =
			/\*\*([\u4e00-\u9fa5])([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF0-9]+?)\*\*/g;
		return text.replace(
			pinyinRegex,
			(_, char, pinyin) => `<ruby>${char}<rt>${pinyin}</rt></ruby>`,
		);
	}

	/**
	 * 转换双下划线标注：==文本|注释== → <span title="注释">文本</span>
	 * @param html 已处理过拼音标注的HTML字符串
	 * @returns 处理后的HTML字符串
	 */
	private convertUnderlineAnnotations(html: string): string {
		// 正则表达式匹配==文本|注释==格式
		const underlineRegex = /==([\s\S]*?)\|([\s\S]*?)==/g;
		return html.replace(underlineRegex, (_, text, note) => {
			// 对注释内容进行HTML转义，防止XSS攻击
			// const escapedNote = this.escapeHtml(note || '');
			return `<span class="double-underline" title="${note}">${text}</span>`;
		});
	}

	/**
	 * HTML特殊字符转义，防止XSS攻击
	 * @param text 原始文本
	 * @returns 转义后的安全文本
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;') // & 转义为 &amp;
			.replace(/</g, '&lt;') // < 转义为 &lt;
			.replace(/>/g, '&gt;') // > 转义为 &gt;
			.replace(/"/g, '&quot;') // " 转义为 &quot;
			.replace(/'/g, '&#039;'); // ' 转义为 &#039;
	}

	/**
	 * 当内容不足时，直接显示原始代码块
	 * @param source 原始文本
	 * @param container 父级容器
	 */
	private displayRawSource(source: string, container: HTMLElement): void {
		container.createEl('pre', { text: source });
	}

	/**
	 * 创建文本容器的辅助函数
	 * @param parent 父级元素
	 * @param className 应用的CSS类名
	 * @param text 显示的文本内容
	 */
	private createTextContainer(
		parent: HTMLElement,
		className: string,
		text: string,
	): void {
		parent.createEl('div', { cls: className, text: text || '' });
	}

	/**
	 * 检查字符串是否为非空行
	 * @param line 输入的字符串
	 * @returns 是否为非空字符串
	 */
	private isNotEmptyLine(line: string): boolean {
		return Boolean(line && line.length > 0);
	}

	private setSafeInnerHTML(element: HTMLElement, html: string) {
		// 已经过 escapeHtml 处理，所以是安全的
		// eslint-disable-next-line no-unsafe-innerhtml/no-unsafe-innerhtml
		element.innerHTML = html;
	}
}
