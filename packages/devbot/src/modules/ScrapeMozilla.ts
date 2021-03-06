import { CheerioWrapper } from '../libs/CheerioWrapper';

const MOZILLA_URL: string = 'https://developer.mozilla.org';
const PROTOTYPE_LIST: string = 'Array|String|Object';

const cheerio = new CheerioWrapper(MOZILLA_URL);

class ScrapeMozilla {
  constructor() {}

  public static async searchDefinition(
    type: string = '',
    method: string
  ): Promise<TResponseMoz> {
    let path: string = '';

    const searchList = await ScrapeMozilla.searchMethod(type, method);

    // creating regex to search
    const regex = new RegExp(`^((${type || PROTOTYPE_LIST})\\.)?${method}\\(\\)`, 'i');

    // the search is carried out
    searchList.forEach((search: TSearch) => {
      if (search.title.search(regex) > -1) path = search.path;
    });

    // the definition data is returned, otherwise the search list
    if (path) {
      const data = await ScrapeMozilla.getDefinition(path);
      return { data };
    } else return { searchList };
  }

  public static async getDefinition(path: string): Promise<TScrape> {
    const $ = await cheerio.load(path);

    const paths: string[] = path.split('/');
    const method: string = paths[paths.length - 1];

    const definition: string = $('p')
      .map((i: number, _el: cheerio.Element) => {
        const el = $(_el);
        const paragraph = el.text();

        if (
          paragraph !== '' &&
          paragraph.length > 1 &&
          !el.hasClass('translationInProgress')
        ) {
          return paragraph;
        }
      })
      .get()[0];

    const el = $('h2#Syntax').text() ? $('h2#Syntax').next() : $('h2#Sintaxis').next();
    const syntax = el.hasClass('syntaxbox') ? el.text() : el.next().text();

    const example = $('pre.js').eq(0).text();

    return {
      method,
      definition,
      syntax,
      example,
      url: MOZILLA_URL + path
    };
  }

  private static async searchMethod(type: string, method: string): Promise<TSearch[]> {
    const $ = await cheerio.load(`/es/search?q=prototype.${method}`);

    let searchList = $('a.result-title')
      .map((i: number, _el: cheerio.Element) => {
        const el = $(_el);

        let title = el.text();
        title = title
          .split('.')
          .filter((t: string) => t !== 'prototype')
          .join('.');
        if (title.search(/\(\)/) > -1) {
          return {
            title,
            path: el.attr('href')
          };
        }
      })
      .get();

    return searchList;
  }

  public static async getMime(ext: string): Promise<TResponseMime | undefined> {
    const path: string = '/es/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types';
    const $ = await cheerio.load(path);

    const tbody = $('.standard-table').children('tbody');

    const mimeList = <TMime[]>tbody
      .children()
      .map((i: number, _el: cheerio.Element) => {
        const el = $(_el);
        const col = el.children();

        return {
          extension: $(col[0]).text(),
          typeDoc: $(col[1]).text(),
          typeMime: $(col[2]).text()
        };
      })
      .get();

    const mime = mimeList.find((mime: TMime) => mime.extension === `.${ext}`);

    if (mime) {
      return {
        mime,
        source: MOZILLA_URL + path
      };
    }
  }
}

export { ScrapeMozilla };
