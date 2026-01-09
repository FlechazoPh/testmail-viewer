const { createApp, ref, computed } = Vue;

const getItemValue = (url, key) => {
    const getItemFromFragmentIdentifier = (url, key) => {
        if (url && url.hash) {
            const hash = url.hash.substr(1);
            const params = new URLSearchParams(hash);
            return params.get(key);
        }
        return null;
    };
    return (
        url.searchParams.get(key) ||
        getItemFromFragmentIdentifier(key) ||
        localStorage.getItem(key)
    );
};

const encodeHTMLToBase64 = (html) => {
    const script =
        '<script>document.querySelectorAll("a").forEach(link => link.setAttribute("target", "_blank"))<\/script>';
    const index = html.indexOf("</html>");
    if (index >= 0) {
        html = html.slice(0, index) + script + html.slice(index);
    }
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};

const html2Text = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("head, style, script").forEach((element) => element.remove());
    div.querySelectorAll("br").forEach((br) => {
        br.insertAdjacentHTML("afterend", "\n");
        br.remove();
    });
    div.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        const text = a.textContent;
        a.insertAdjacentHTML("afterend", `${text}[${href}]`);
        a.remove();
    });
    return div.textContent;
};

const isMobile = () => window.innerWidth <= 768;

createApp({
    setup() {
        const url = new URL(document.location.href);
        const namespace = ref(getItemValue(url, "namespace"));
        const apikey = ref(getItemValue(url, "apikey"));
        const items = ref([]);
        const current = ref(null);
        const showAlert = ref(true);
        const showHTML = ref(false);
        const showContent = ref(false);
        const offset = ref(0);
        const encodedHTML = computed(() => {
            return encodeHTMLToBase64(current.value?.html || "");
        });

        const selectItem = (item) => {
            showHTML.value = false;
            showAlert.value = true;
            if (!item.text && item.html) {
                item.text = html2Text(item.html);
            }
            current.value = item;
            if (isMobile()) {
                showContent.value = true;
            }
        };

        const goBack = () => {
            showContent.value = false;
        };

        const loadData = (_offset) => {
            localStorage.setItem("namespace", namespace.value);
            localStorage.setItem("apikey", apikey.value);
            fetch("/api/emails", {
                method: "POST",
                body: btoa(
                    JSON.stringify({
                        apikey: apikey.value,
                        namespace: namespace.value,
                        limit: 10,
                        offset: _offset,
                    })
                ),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (_offset) {
                        items.value = items.value.concat(data.emails);
                    } else {
                        items.value = data.emails;
                        if (data.emails.length > 0 && !isMobile()) {
                            selectItem(items.value[0]);
                        } else if (data.emails.length > 0) {
                            current.value = null;
                            showContent.value = false;
                        }
                    }
                    offset.value = data.offset + data.limit;
                });
        };

        const fileSizeToString = (size) => {
            if (size < 1000) {
                return `${size} B`;
            }
            if (size < 1000 * 1000) {
                return `${(size / 1000).toFixed(2)} KB`;
            }
            if (size < 1000 * 1000 * 1000) {
                return `${(size / 1000 / 1000).toFixed(2)} MB`;
            }
            return `${(size / 1000 / 1000 / 1000).toFixed(2)} GB`;
        };

        if (apikey.value && namespace.value) {
            loadData(0);
        }

        return {
            namespace,
            apikey,
            items,
            offset,
            current,
            showAlert,
            showHTML,
            showContent,
            encodedHTML,
            loadData,
            selectItem,
            goBack,
            fileSizeToString,
        };
    },
}).mount("#app");
