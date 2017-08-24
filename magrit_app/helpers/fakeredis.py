#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@author: mthh
"""

import time
from threading import RLock, Timer
from collections import deque


class FakeAioRedisConnection:
    def __init__(self, max_age_seconds=120):
        assert max_age_seconds >= 1
        self.store = {}
        self.max_age = max_age_seconds
        self.lock = RLock()
        self.closed = False
        self.clean_keys()

    async def pexpire(self, key, pexpire):
        self.expire(key, pexpire / 1000)

    async def expire(self, key, expire):
        with self.lock:
            item = self.store.get(key, None)
            if not item:
                return None
            self.store[key] = (item[0], time.time() + expire)

    async def persist(self, key):
        with self.lock:
            item = self.store.get(key, None)
            if not item:
                return None
            self.store[key] = (item[0], float('inf'))

    async def set(self, key, value, pexpire=None):
        with self.lock:
            if not pexpire:
                self.store[key] = (
                        str(value).encode(), float('inf'))
            else:
                self.store[key] = (
                        str(value).encode(), time.time() + pexpire / 1000)

    async def get(self, key):
        with self.lock:
            item = self.store.get(key, None)
            if not item:
                return None
            return item[0]

    async def delete(self, key, default=None):
        with self.lock:
            item = self.store.get(key, None)
            if not item:
                return None
            del self.store[key]
            return item[0]

    async def lpush(self, key, value):
        with self.lock:
            li, timeout = self.store.get(key, (None, None))
            if not li:
                self.store[key] = (deque([value]), float('inf'))
            else:
                li.appendleft(value)
                self.store[key] = (li, timeout)
            return

    async def lpushx(self, key, value):
        with self.lock:
            li, timeout = self.store.get(key, (None, None))
            if not li:
                return None
            li.appendleft(value)
            self.store[key] = (li, timeout)
            return

    async def rpush(self, key, value):
        with self.lock:
            li, timeout = self.store.get(key, (None, None))
            if not li:
                self.store[key] = (deque([value]), float('inf'))
            else:
                li.append(value)
                self.store[key] = (li, timeout)
            return

    async def rpushx(self, key, value):
        with self.lock:
            li, timeout = self.store.get(key, (None, None))
            if not li:
                return None
            li.append(value)
            self.store[key] = (li, timeout)
            return

    async def lpop(self, key):
        with self.lock:
            li, _ = self.store.get(key, (None, None))
            if not li:
                return None
            elem = li.popleft()
            return elem

    async def rpop(self, key):
        with self.lock:
            li, _ = self.store.get(key, (None, None))
            if not li:
                return None
            elem = li.pop()
            return elem

    async def lrange(self, key, start, end):
        with self.lock:
            li, _ = self.store.get(key, (None, None))
            if not li:
                return []
            if start == 0 and end == -1:
                return li
            return li[start, end]

    async def llen(self, key):
        with self.lock:
            li, _ = self.store.get(key, (None, None))
            if not li:
                return None
            return len(li)

    async def incr(self, key):
        with self.lock:
            value, timeout = self.store.get(key, (0, float('inf')))
            value += 1
            self.store[key] = (value, timeout)

    async def incrby(self, key, increment):
        with self.lock:
            value, timeout = self.store.get(key, (0, float('inf')))
            value += increment
            self.store[key] = (value, timeout)

    async def quit(self):
        with self.lock:
            self.closed = True
            self.store = {}
        return

    def clean_keys(self):
        if self.closed:
            return
        for k in list(self.store.keys()):
            with self.lock:
                item = self.store[k]
                if time.time() > item[1]:
                    del self.store[k]
        Timer(self.max_age, self.clean_keys).start()
