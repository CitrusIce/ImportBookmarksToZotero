from logging import error
import time
import traceback
from typing import Collection
import bookmarks_parser
import asyncio
from pyppeteer import launch
import pyppeteer
import json
import subprocess
import logging
import os
import argparse


class LoadTimeOut(BaseException):
    def __init__(self, arg):
        self.args = arg
        pass


logFormatter = logging.Formatter(
    "[%(asctime)s] p%(process)s {%(pathname)s:%(lineno)d} %(levelname)s - %(message)s",
    "%m-%d %H:%M:%S",
)
rootLogger = logging.getLogger()
rootLogger.setLevel(logging.INFO)

fileHandler = logging.FileHandler("log.txt")
fileHandler.setFormatter(logFormatter)
rootLogger.addHandler(fileHandler)

consoleHandler = logging.StreamHandler()
consoleHandler.setFormatter(logFormatter)
rootLogger.addHandler(consoleHandler)


class TabPool:
    def __init__(self, maxsize) -> None:
        self.queue = asyncio.Queue(maxsize=maxsize)

    async def init(self, browser):
        for i in range(self.queue.maxsize):
            await self.queue.put(await browser.newPage())

    async def get(self):
        return await self.queue.get()

    async def release(self, page):
        await page.goto("about:blank", {"timeout": 0})
        self.queue.task_done()
        await self.queue.put(page)


class Zotero:
    def __init__(self, ext_path, zotero_path, proxy=None) -> None:
        self.ext_path = ext_path
        self.max_tabs = 8
        self.tabpool = TabPool(self.max_tabs)
        self.tabs_num = 0
        self.proxy = proxy
        self.error_list = []
        self.zotero_path = zotero_path
        self.start_zotero()
        self.error_count = 0

    def start_zotero(self):
        self.process = subprocess.Popen(self.zotero_path)
        time.sleep(5)
        return

    def terminate_zotero(self):
        self.process.terminate()

    def restart_zotero(self):
        time.sleep(5)
        self.terminate_zotero()
        self.start_zotero()

    async def init(self):
        cwd = os.getcwd()
        path = os.path.join(cwd, "temp")
        if not os.path.exists(path):
            os.mkdir(path)
        if self.proxy:
            self.browser = await launch(
                {
                    "headless": False,
                    "userDataDir": path,
                    "args": [
                        "--no-sandbox",
                        "--ignore-certificate-errors",
                        "--load-extension={}".format(self.ext_path),
                        "--disable-extensions-except={}".format(self.ext_path),
                        "--proxy-server={}".format(self.proxy),
                    ],
                }
            )
        else:
            self.browser = await launch(
                {
                    "headless": False,
                    "userDataDir": path,
                    "args": [
                        "--no-sandbox",
                        "--ignore-certificate-errors",
                        "--load-extension={}".format(self.ext_path),
                        "--disable-extensions-except={}".format(self.ext_path),
                    ],
                }
            )
        await self.tabpool.init(self.browser)

    async def close(self):
        with open("error_list.json", "w") as f:
            f.write(json.dumps(self.error_list))
        await self.browser.close()

    def __error_notify(self):
        self.error_count += 1
        if self.error_count > 5:
            self.restart_zotero()
            self.error_count = 0

    async def add_url(self, url, collection, tags):
        page = await self.tabpool.get()
        logging.info("get tab {}".format(url))
        try:
            logging.info("add url {}".format(url))
            await asyncio.wait_for(
                self.__add_url(url, collection, tags, page), timeout=60
            )
        except LoadTimeOut:
            logging.error(url + " page load timeout")
            self.error_list.append({"url": url, "tags": tags, "collection": collection})
        except asyncio.TimeoutError as e:
            logging.error(url + " add to Zotero timeout!")
            self.__error_notify()
            self.error_list.append({"url": url, "tags": tags, "collection": collection})
        except Exception as e:
            logging.error(url + " unknown error " + repr(e))
            self.error_list.append({"url": url, "tags": tags, "collection": collection})
        finally:
            logging.info("release tab {}".format(url))
            await self.tabpool.release(page)
        logging.info("add_url finish {}".format(url))

    async def __add_url(self, url, collection, tags, page):
        respone = await asyncio.gather(
            page.waitForNavigation(),
            page.goto(
                url,
                {
                    "waitUntil": [
                        "load",
                        "domcontentloaded",
                        "networkidle0",
                        "networkidle2",
                    ]
                },
            ),
            return_exceptions=True,
        )
        for r in respone:
            if issubclass(type(r), Exception):
                raise LoadTimeOut("__add_url time out")

        all_script = """window.addEventListener("message", function (event) {{
        if (event.data.type && (event.data.type == "finish")) {{
            var a = document.createElement("finish");
            document.body.appendChild(a);
        }}
    }});
    window.postMessage({}, "*");""".format(
            json.dumps(
                {
                    "type": "save",
                    "content": {
                        "title": await page.title(),
                        "collection": collection,
                        "tags": tags,
                    },
                }
            )
        )

        await page.evaluate(all_script)

        await page.waitForSelector("finish")


def dfs(bookmark_node, folder_name):
    if bookmark_node["type"] == "folder" and bookmark_node["title"] == folder_name:
        return bookmark_node
    else:
        result = None
        for node in [n for n in bookmark_node["children"] if n["type"] == "folder"]:
            result = dfs(node, folder_name)
            if result is not None:
                break
        return result


def dfs_add_url(node, tags, collection, zotero, task_list):
    if node["type"] == "bookmark":
        task = asyncio.create_task(zotero.add_url(node["url"], collection, tags[:-1]))
        task_list.append(task)
    else:
        for n in node["children"]:
            dfs_add_url(n, tags + node["title"] + ",", collection, zotero, task_list)


async def main():
    parser = argparse.ArgumentParser(description="import bookmarks to Zotero")
    COLLECTION_NAME = "Security"
    parser.add_argument("zotero_path", help="path to Zotero.exe")
    parser.add_argument("--bookmarks", help="bookmarks file path")
    parser.add_argument("--folder", help="bookmarks folder name")
    parser.add_argument("--errorlist", help="error list file path")
    parser.add_argument(
        "--proxy", help="proxy for browser. example:--proxy socks5://127.0.0.1:1080"
    )
    parser.add_argument("--ext", help="unpack extention folder path not crx file")
    args = parser.parse_args()
    task_list = []
    EXT_PATH = ""
    if args.ext is None:
        EXT_PATH = os.path.join(os.getcwd(), "zotero-connector")
    else:
        EXT_PATH = args.ext
    if not os.path.exists(EXT_PATH):
        print("extention not found!",EXT_PATH)
        return
    # zotero = Zotero(EXT_PATH, "socks5://127.0.0.1:7890")
    zotero = Zotero(EXT_PATH, args.zotero_path, proxy=args.proxy)
    await zotero.init()
    if args.bookmarks is not None:
        bookmarks = bookmarks_parser.parse(args.bookmarks)
        if args.folder is not None:
            node = dfs(bookmarks[0], args.folder)
            dfs_add_url(node, "", COLLECTION_NAME, zotero, task_list)
        else:
            dfs_add_url(bookmarks, "", COLLECTION_NAME, zotero, task_list)

    elif args.errorlist is not None:
        error_list = json.load(open(args.errorlist, "r"))
        for error in error_list:
            task = asyncio.create_task(
                zotero.add_url(error["url"], error["collection"], error["tags"])
            )
            task_list.append(task)

    logging.info("task list len: {}".format(len(task_list)))
    for t in task_list:
        await t
    await zotero.close()
    logging.info("task finish")


asyncio.get_event_loop().run_until_complete(main())
