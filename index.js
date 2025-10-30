const app = {
    data: [],

    //define available filters
    filterConfig: [
        { key: "brand", label: "Brand" },
        { key: "launch-year", label: "Launch Year" },
        { key: "operating-system", label: "Operating System" },
        { key: "cpu", label: "CPU" }
    ],

    sortColumn: 'height',
    sortOrder: 'asc',
    maxHeight: 0,
    maxWidth: 0,
    activeFilterSelections: {}, // create dict to contain filter choices

    async init() {
        await this.loadData();
        this.setupFilters();
        this.setupSorting();
        this.renderDevices();
    },

    // handle loading data from csv
    async loadData() {
        //f etch data
        const response = await fetch("data.csv");
        const text = await response.text();

        // clean up data
        const rows = text.trim().split('\n');
        const headers = rows[0].split(',');

        // iterate
        this.data = rows.slice(1).map(row => {
            const cols = row.split(',');
            const obj = {};
            headers.forEach((h, i) => obj[h] = isNaN(+cols[i]) ? cols[i] : +cols[i]);
            return obj;
        });

        // calculate dimensions
        this.maxHeight = Math.max(...this.data.map(d => d.height));
        this.maxWidth = Math.max(...this.data.map(d => d.width));
    },

    setupFilters() {
        // fetch divs to display filter section
        const filterDropDownContainer = document.getElementById("filter-dropdown-container"); // fetch container for filters
        const filterListContainer = document.getElementById("filter-list-container"); // fetch container for filters

        // iterate through extant filters
        this.filterConfig.forEach(config => {
            const filterKey = config.key; //fetch the key

            //create dropdown
            const select = document.createElement("select"); //instantiate dropdown for this filter
            select.id = `${filterKey}-select`; //set id for the dropdown to use this filter's name
            select.className = "filter-dropdown"; //set class for later selection
            select.name = filterKey; //set name of dropdown to key for reference later

            //populate values from csv
            const uniqueValues = ["all", ...new Set(this.data.map(d => d[filterKey]))];
            uniqueValues.forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value === "all" ? `All ${config.label}s` : value;
                select.appendChild(option);
            });

            //create label for the dropdown
            const label = document.createElement("label");
            label.textContent = `${config.label}: `;
            label.appendChild(select);

            //create filter display
            this.activeFilterSelections[filterKey] = []; //add entry to the selected options array for this filter
            const activeFilters = document.createElement("div"); //instantiate div to display selected filters
            activeFilters.id = `${filterKey}-active-filters`; // set id for this div to use the filter's name

            // create event listener to add items to list when they are selected from dropdown
            select.addEventListener("change", () => {
                //if the value is all, or key already in list, don't add
                if (select.value != 'all' && !this.activeFilterSelections[filterKey].includes(select.value)) {
                    this.activeFilterSelections[filterKey].push(select.value); // add to array

                    // render button
                    const filterListContainer = document.getElementById(`${filterKey}-active-filters`); // fetch container for filters
                    const filterButton = document.createElement("BUTTON"); //create the button
                    filterButton.id = `${select.value}-button`; //set id for the dropdown to use this filter's name
                    filterButton.value = `${select.value}`; // set value for the dropdown to use this filter's name
                    filterButton.innerHTML = select.value; // set text for the dropdown to use this filter's name
                    filterListContainer.appendChild(filterButton); // add button to page
                    // define an onclick so we have a method of removal (clicking)
                    filterButton.addEventListener('click', () => {
                        const index = this.activeFilterSelections[filterKey].indexOf(filterButton.value); // check array for this item
                        if (index > -1) { // only splice array when item is found
                            this.activeFilterSelections[filterKey].splice(index, 1); // 2nd parameter means remove one item only
                            document.getElementById(filterButton.id).remove(); //remove from screen
                            this.renderDevices(); //redraw with new parameters
                        };
                    });
                    select.value = 'all'; // set the dropdown back to default
                    this.renderDevices();
                };
            });

            //append new items to page
            filterDropDownContainer.appendChild(label);
            filterListContainer.appendChild(activeFilters);

            this.renderDevices(); // redraw page
        });
    },

    setupSorting() {
        const sortColumnSelect = document.getElementById("sort-column");
        const headers = Object.keys(this.data[0]);
        headers.forEach(header => {
            const option = document.createElement("option");
            option.value = header;
            option.textContent = header.charAt(0).toUpperCase() + header.slice(1).replace('-', ' ');
            if (header === this.sortColumn) option.selected = true;
            sortColumnSelect.appendChild(option);
        });

        sortColumnSelect.addEventListener("change", () => {
            this.sortColumn = sortColumnSelect.value;
            this.renderDevices();
        });

        const sortOrderSelect = document.getElementById("sort-order");
        sortOrderSelect.value = this.sortOrder;
        sortOrderSelect.addEventListener("change", () => {
            this.sortOrder = sortOrderSelect.value;
            this.renderDevices();
        });
    },

    renderDevices() {
        let filteredData = this.data.filter(d => {
            let elements = document.getElementsByClassName("filter-dropdown");
            //do all of these elements end up being true
            return Array.from(elements).every((dropdown) => {
                let thisFilter = this.activeFilterSelections[dropdown.name]; // get the correct list
                return (thisFilter.length <= 0 && dropdown.value === "all") || thisFilter.includes(d[dropdown.name].toString()); // return true if all selected or there's a match
            });
        });

        filteredData.sort((a, b) => {
            const aVal = a[this.sortColumn];
            const bVal = b[this.sortColumn];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return this.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        //populate device list div
        const deviceList = document.getElementById("device-list"); // fetch element from page
        deviceList.innerHTML = ""; // remove existing content

        //iterate through devices
        filteredData.forEach(d => {
            const card = document.createElement("article");
            card.className = "device-card";

            const scale = 200 / this.maxHeight;
            const visualHeight = d.height * scale;
            const visualWidth = d.width * scale;

            const specs = Object.entries(d).filter(([key]) => key !== 'height' && key !== 'width').map(([key, value]) => {
                let unit = '';
                let val = value;
                let parsedKey = key.trim()
                if (['depth'].includes(parsedKey)) unit = ' mm';
                else if (parsedKey === 'screen-size') unit = ' inch';
                else if (parsedKey === 'ram') unit = ' GB';
                else if (parsedKey === 'battery') unit = ' mAh';
                return `<div class="spec"><strong data-attribute="${key}">${parsedKey.charAt(0).toUpperCase() + parsedKey.slice(1).replace('-', ' ')}:</strong> ${value}${unit}</div>`;
            }).join('');

            card.innerHTML = `
            <h3>${d.brand} ${d.model}</h3>
            <div class="dimensions">
              <div class="dimension-box" style="width: ${visualWidth}px; height: ${visualHeight}px;">${d['screen-size']}\"\</div>
              <p><strong>Height:</strong> ${d.height}mm<br><strong>Width:</strong> ${d.width}mm</p>
            </div>
            <div class="specs">${specs}</div>
          `;
            deviceList.appendChild(card);
        });
    }
};

app.init();