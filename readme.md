# Import Bookmarks to Zotero
This is a script for automate importing webpages in netscape bookmarks to Zotero

```
usage: main.py [-h] [--bookmarks BOOKMARKS] [--errorlist ERRORLIST]
               [--proxy PROXY] [--ext EXT]
               zotero_path

import bookmarks to Zotero

positional arguments:
  zotero_path           path to Zotero.exe

optional arguments:
  -h, --help            show this help message and exit
  --bookmarks BOOKMARKS
                        bookmarks file path
  --errorlist ERRORLIST
                        error list file path
  --proxy PROXY         proxy for browser. example:--proxy
                        socks5://127.0.0.1:1080
  --ext EXT             unpack extention folder path not crx file


  > python main.py --bookmarks bookmarks.html C:\Program Files (x86)\Zotero\zotero.exe

  # bookmarks.html is the netscape bookmarks file that you export from your browser
  ```

There might be some error while adding web pages to Zotero and all error url will be output in error_list.json file. You can use --errorlist options to reimport those url

A post about writing this tool: https://citrusice.github.io/posts/importing-bookmarks-to-zotero/