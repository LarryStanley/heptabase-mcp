interface TextNode {
  type: 'text';
  text: string;
  marks?: Array<{
    type: string;
    attrs?: any;
  }>;
}

interface ElementNode {
  type: string;
  attrs?: any;
  content?: ContentNode[];
}

type ContentNode = TextNode | ElementNode;

interface DocContent {
  type: 'doc';
  content: ContentNode[];
}

export function parseHeptabaseContentToMarkdown(contentJson: string): string {
  try {
    const doc: DocContent = JSON.parse(contentJson);
    return processNode(doc);
  } catch (e) {
    // If parsing fails, return the raw content
    return contentJson;
  }
}

function processNode(node: ContentNode): string {
  if (!node) return '';

  switch (node.type) {
    case 'doc':
      return (node as ElementNode).content?.map(processNode).join('') || '';
    
    case 'text':
      return applyMarks((node as TextNode).text, (node as TextNode).marks);
    
    case 'heading':
      const level = (node as ElementNode).attrs?.level || 1;
      const headingText = (node as ElementNode).content?.map(processNode).join('') || '';
      return '#'.repeat(level) + ' ' + headingText + '\n\n';
    
    case 'paragraph':
      const paragraphText = (node as ElementNode).content?.map(processNode).join('') || '';
      return paragraphText + '\n\n';
    
    case 'bullet_list':
      return (node as ElementNode).content?.map(processNode).join('') || '';
    
    case 'bullet_list_item':
      const itemText = (node as ElementNode).content?.map(processNode).join('') || '';
      return '- ' + itemText.trim() + '\n';
    
    case 'ordered_list':
      let index = 1;
      return (node as ElementNode).content?.map(child => {
        const itemText = processNode(child);
        return `${index++}. ${itemText.trim()}\n`;
      }).join('') || '';
    
    case 'code_block':
      const lang = (node as ElementNode).attrs?.params?.replace('!', '') || '';
      const codeContent = (node as ElementNode).content?.map(processNode).join('') || '';
      return '```' + lang + '\n' + codeContent + '\n```\n\n';
    
    case 'horizontal_rule':
      return '---\n\n';
    
    case 'blockquote':
      const quoteContent = (node as ElementNode).content?.map(processNode).join('') || '';
      return '> ' + quoteContent.split('\n').join('\n> ') + '\n\n';
    
    case 'card':
      // Reference to another card
      const cardId = (node as ElementNode).attrs?.cardId;
      return `[Card Reference: ${cardId}]\n`;
    
    case 'image':
      const src = (node as ElementNode).attrs?.src || '';
      const alt = (node as ElementNode).attrs?.alt || '';
      return `![${alt}](${src})\n\n`;
    
    default:
      // For unknown types, try to process children if they exist
      if ((node as ElementNode).content) {
        return (node as ElementNode).content?.map(processNode).join('') || '';
      }
      return '';
  }
}

function applyMarks(text: string, marks?: Array<{ type: string; attrs?: any }>): string {
  if (!marks || marks.length === 0) return text;
  
  let result = text;
  
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `**${result}**`;
        break;
      case 'italic':
        result = `*${result}*`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'link':
        const href = mark.attrs?.href || '#';
        result = `[${result}](${href})`;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
    }
  }
  
  return result;
}

export function parseHeptabaseContentToHtml(contentJson: string): string {
  try {
    const doc: DocContent = JSON.parse(contentJson);
    return processNodeToHtml(doc);
  } catch (e) {
    return `<p>${contentJson}</p>`;
  }
}

function processNodeToHtml(node: ContentNode): string {
  if (!node) return '';

  switch (node.type) {
    case 'doc':
      return (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
    
    case 'text':
      return applyHtmlMarks((node as TextNode).text, (node as TextNode).marks);
    
    case 'heading':
      const level = (node as ElementNode).attrs?.level || 1;
      const headingText = (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      return `<h${level}>${headingText}</h${level}>`;
    
    case 'paragraph':
      const paragraphText = (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      return `<p>${paragraphText}</p>`;
    
    case 'bullet_list':
      const listContent = (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      return `<ul>${listContent}</ul>`;
    
    case 'bullet_list_item':
      const itemText = (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      return `<li>${itemText}</li>`;
    
    case 'code_block':
      const codeContent = (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      return `<pre><code>${codeContent}</code></pre>`;
    
    case 'card':
      const cardId = (node as ElementNode).attrs?.cardId;
      return `<div class="card-reference" data-card-id="${cardId}">[Card: ${cardId}]</div>`;
    
    default:
      if ((node as ElementNode).content) {
        return (node as ElementNode).content?.map(processNodeToHtml).join('') || '';
      }
      return '';
  }
}

function applyHtmlMarks(text: string, marks?: Array<{ type: string; attrs?: any }>): string {
  if (!marks || marks.length === 0) return text;
  
  let result = text;
  
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        const href = mark.attrs?.href || '#';
        result = `<a href="${href}">${result}</a>`;
        break;
    }
  }
  
  return result;
}