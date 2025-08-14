import { itemsList } from './items.js';
import { materialsList } from './materials.js';
import { workmanshipList } from './workmanship.js';
import { laborList } from './labor.js';

class ConstructionCalculator {
    // Add number formatting function
    formatNumber(number) {
        if (isNaN(number) || number === null || number === undefined) return '0.00';
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    constructor() {
        this.initializeElements();
        this.loadMainItems();
        this.setupEventListeners();
        this.resourcesList = [...materialsList, ...workmanshipList, ...laborList];
        this.customPrices = new Map(); // Store custom prices
        this.customUnits = new Map(); // Store custom units
        this.loadPricesSection();
        this.resourcesSection = document.getElementById('resourcesSection');
        this.resourcesAccordion = document.getElementById('resourcesAccordion');
        this.resourcesMaterialsHeader = document.getElementById('resourcesMaterialsHeader');
        this.resourcesMaterialsBody = document.getElementById('resourcesMaterialsBody');
        this.resourcesWorkmanshipHeader = document.getElementById('resourcesWorkmanshipHeader');
        this.resourcesWorkmanshipBody = document.getElementById('resourcesWorkmanshipBody');
        this.resourcesLaborHeader = document.getElementById('resourcesLaborHeader');
        this.resourcesLaborBody = document.getElementById('resourcesLaborBody');
        this.resourceTypeFilter = document.getElementById('resourceTypeFilter');

        // Add item counts to tab labels
        const materialsTab = document.querySelector('button[data-tab="materials"]');
        const workmanshipTab = document.querySelector('button[data-tab="workmanship"]');
        const laborTab = document.querySelector('button[data-tab="labor"]');
        if (materialsTab) materialsTab.textContent = `الخامات (${materialsList.length})`;
        if (workmanshipTab) workmanshipTab.textContent = `المصنعيات (${workmanshipList.length})`;
        if (laborTab) laborTab.textContent = `العمالة (${laborList.length})`;

        // Project management elements
        this.projectForm = document.getElementById('projectForm');
        this.projectNameInput = document.getElementById('projectName');
        this.projectCodeInput = document.getElementById('projectCode');
        this.projectTypeInput = document.getElementById('projectType');
        this.projectAreaInput = document.getElementById('projectArea');
        this.projectFloorInput = document.getElementById('projectFloor');
        this.createProjectBtn = document.getElementById('createProjectBtn');
        this.projectsList = document.getElementById('projectsList');
        this.currentProjectDisplay = document.getElementById('currentProjectDisplay');
        // Project data
        this.projects = this.loadProjects();
        this.currentProjectId = this.loadCurrentProjectId();
        // Initialize project management UI
        this.setupProjectManagement();
        // ... rest of constructor ...
        // On project change, reload all data
        this.loadProjectData();
        this.customRates = {};
        this.laborExtrasPerFloor = {}; // resourceName -> extra amount per additional floor
        this.laborFloorLevel = 1; // labor-only floor level

        // In constructor, add modal elements
        this.itemDetailsModal = document.getElementById('itemDetailsModal');
        this.itemDetailsTitle = document.getElementById('itemDetailsTitle');
        this.itemDetailsContent = document.getElementById('itemDetailsContent');
        this.closeItemDetailsModal = document.getElementById('closeItemDetailsModal');
        if (this.closeItemDetailsModal) {
            this.closeItemDetailsModal.onclick = () => this.hideItemDetailsModal();
        }
        // Hide modal on outside click
        if (this.itemDetailsModal) {
            this.itemDetailsModal.addEventListener('click', (e) => {
                if (e.target === this.itemDetailsModal) this.hideItemDetailsModal();
            });
        }
        // Collapsible panels logic
        this.setupCollapsiblePanels();


        // Export Excel button logic
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.onclick = () => this.exportProjectToExcel();
        }

        // In constructor after loadPricesSection
        this.loadPricesSection();
        // Show initial resources totals
        this.updateResourcesTotals();
        
        // Initialize undo system
        this.undoStack = [];
        this.maxUndoActions = 10; // Keep last 10 actions
        
        // Initialize summary totals
        this.updateSummaryTotal();
        this.updateSummarySellingTotal();
        this.summaryFinalTotal = document.getElementById('summaryFinalTotal');
        this.supervisionPercentage = document.getElementById('supervisionPercentage');
        this.lastDeletedCardData = null;
        this.lastDeletedCardElement = null;
        this.unitPriceDisplay = document.getElementById('unitPriceDisplay');
        
        // Add event listener for supervision percentage
        if (this.supervisionPercentage) {
            this.supervisionPercentage.addEventListener('input', () => {
                this.updateSummaryFinalTotal();
            });
            
            // Also add change event for better reliability
            this.supervisionPercentage.addEventListener('change', () => {
                this.updateSummaryFinalTotal();
            });
            
            // Add focus event to ensure the element is properly initialized
            this.supervisionPercentage.addEventListener('focus', () => {
                // Focus event for reliability
            });
        } else {
            // Try to find it again after a short delay
            setTimeout(() => {
                this.supervisionPercentage = document.getElementById('supervisionPercentage');
                if (this.supervisionPercentage) {
                    this.supervisionPercentage.addEventListener('input', () => {
                        this.updateSummaryFinalTotal();
                    });
                    this.supervisionPercentage.addEventListener('change', () => {
                        this.updateSummaryFinalTotal();
                    });
                }
            }, 100);
        }
    }

    setupCollapsiblePanels() {
        const panels = [
            { header: 'pricesPanelHeader', content: 'pricesPanelContent', toggle: 'pricesPanelHeader' },
            { header: 'inputPanelHeader', content: 'inputPanelContent', toggle: 'inputPanelHeader' },
            { header: 'resourcesPanelHeader', content: 'resourcesPanelContent', toggle: 'resourcesPanelHeader' },
            { header: 'summaryPanelHeader', content: 'summaryPanelContent', toggle: 'summaryPanelHeader' }
        ];
        panels.forEach(({ header, content }) => {
            const headerEl = document.getElementById(header);
            const contentEl = document.getElementById(content);
            if (!headerEl || !contentEl) return;
            const btn = headerEl.querySelector('.collapsible-toggle');
            // Collapse by default
            contentEl.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = '+';
            // Toggle logic
            const toggle = (e) => {
                e.stopPropagation();
                const expanded = contentEl.style.display === 'block';
                contentEl.style.display = expanded ? 'none' : 'block';
                btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                btn.textContent = expanded ? '+' : '–';
            };
            btn.onclick = toggle;
            headerEl.onclick = (e) => {
                if (e.target.classList.contains('collapsible-toggle')) return;
                toggle(e);
            };
        });
    }

    initializeElements() {
        this.mainItemSelect = document.getElementById('mainItemSelect');
        this.subItemSelect = document.getElementById('subItemSelect');
        this.quantityInput = document.getElementById('quantityInput');
        this.wastePercentInput = document.getElementById('wastePercentInput');
        this.operationPercentInput = document.getElementById('operationPercentInput');
        this.totalCostElement = document.getElementById('totalCost');
        this.resultsSection = document.getElementById('resultsSection');
        this.materialsTable = document.getElementById('materialsTable').querySelector('tbody');
        this.workmanshipTable = document.getElementById('workmanshipTable').querySelector('tbody');
        this.laborTable = document.getElementById('laborTable').querySelector('tbody');
        
        // Prices section elements
        this.materialsGrid = document.getElementById('materials-grid');
        this.workmanshipGrid = document.getElementById('workmanship-grid');
        this.laborGrid = document.getElementById('labor-grid');
        this.laborFloorLevelInput = null; // will be set dynamically
        this.laborExtraInputs = {}; // resourceName: input element

        // Accordion elements
        this.materialsAccordion = document.getElementById('materialsAccordion');
        this.workmanshipAccordion = document.getElementById('workmanshipAccordion');
        this.laborAccordion = document.getElementById('laborAccordion');
        this.materialsHeader = document.getElementById('materialsHeader');
        this.workmanshipHeader = document.getElementById('workmanshipHeader');
        this.laborHeader = document.getElementById('laborHeader');
        this.materialsBody = document.getElementById('materialsBody');
        this.workmanshipBody = document.getElementById('workmanshipBody');
        this.laborBody = document.getElementById('laborBody');
        this.materialsDesc = document.getElementById('materialsDesc');
        this.workmanshipDesc = document.getElementById('workmanshipDesc');
        this.laborDesc = document.getElementById('laborDesc');
        this.materialsTotal = document.getElementById('materialsTotal');
        this.workmanshipTotal = document.getElementById('workmanshipTotal');
        this.laborTotal = document.getElementById('laborTotal');
        this.saveItemBtn = document.getElementById('saveItemBtn');
        this.summarySection = document.getElementById('summarySection');
        this.summaryCards = document.getElementById('summaryCards');
        this.summaryUndoBtn = document.getElementById('summaryUndoBtn');
        this.summaryTotal = document.getElementById('summaryTotal');
        this.summarySellingTotal = document.getElementById('summarySellingTotal');
        this.summaryFinalTotal = document.getElementById('summaryFinalTotal');
        this.supervisionPercentage = document.getElementById('supervisionPercentage');
        this.lastDeletedCardData = null;
        this.lastDeletedCardElement = null;
        this.unitPriceDisplay = document.getElementById('unitPriceDisplay');
    }

    loadMainItems() {
        // Get unique main items from itemsList
        const mainItems = [...new Set(itemsList.map(item => item['Main Item']))];
        
        // Custom desired order (these appear first in this exact order)
        const desiredOrder = [
            'الهدم',
            'المباني',
            'تأسيس كهرباء',
            'تأسيس سباكة',
            'العزل',
            'تأسيس تكييفات',
            'المحارة',
            'جبسوم بورد',
            'بورسلين',
            'رخام',
            'نقاشة'
        ];
        const priorityIndex = new Map(desiredOrder.map((name, idx) => [name, idx]));
        
        // Sort by custom priority first, then Arabic alphabetical for the rest
        mainItems.sort((a, b) => {
            const ra = priorityIndex.has(a) ? priorityIndex.get(a) : Number.POSITIVE_INFINITY;
            const rb = priorityIndex.has(b) ? priorityIndex.get(b) : Number.POSITIVE_INFINITY;
            if (ra !== rb) return ra - rb;
            return a.localeCompare(b, 'ar');
        });
        
        this.mainItemSelect.innerHTML = '<option value="">-- اختر البند الرئيسي --</option>';
        mainItems.forEach(mainItem => {
            const option = document.createElement('option');
            option.value = mainItem;
            option.textContent = mainItem;
            this.mainItemSelect.appendChild(option);
        });
    }

    loadSubItems(mainItem) {
        this.subItemSelect.innerHTML = '<option value="">-- اختر البند الفرعي --</option>';
        this.subItemSelect.disabled = false;

        const subItems = itemsList
            .filter(item => item['Main Item'] === mainItem)
            .map(item => item['Sub Item'])
            .filter((value, index, self) => self.indexOf(value) === index);

        subItems.forEach(subItem => {
            const option = document.createElement('option');
            option.value = subItem;
            option.textContent = subItem;
            this.subItemSelect.appendChild(option);
        });
    }

    loadPricesSection() {
        // Load materials prices
        this.loadResourcePrices(materialsList, this.materialsGrid, 'materials');
        
        // Load workmanship prices
        this.loadResourcePrices(workmanshipList, this.workmanshipGrid, 'workmanship');
        
        // Load labor prices
        this.loadResourcePrices(laborList, this.laborGrid, 'labor');
    }

    loadResourcePrices(resources, container, type) {
        container.innerHTML = '';
        
        if (type === 'materials') {
            this.loadMaterialsBySectors(container);
        } else if (type === 'workmanship') {
            this.loadWorkmanshipBySectors(container);
        } else if (type === 'labor') {
            // Add floor level input at the top
            const floorDiv = document.createElement('div');
            floorDiv.className = 'labor-floor-level-group';
            const initialFloor = this.laborFloorLevel || 1;
            floorDiv.innerHTML = `
                <label for="laborFloorLevelInput">رقم الدور:</label>
                <input type="number" id="laborFloorLevelInput" min="1" step="1" value="${initialFloor}" style="width: 80px; margin-left: 8px;">
            `;
            container.appendChild(floorDiv);
            this.laborFloorLevelInput = floorDiv.querySelector('#laborFloorLevelInput');
            const onFloorChange = () => {
                const prevFloor = this.laborFloorLevel || 1;
                this.laborFloorLevel = parseInt(this.laborFloorLevelInput.value) || 1;
                this.saveProjectLaborFloorLevel();
                this.updateLaborPricesForFloor(prevFloor);
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            };
            this.laborFloorLevelInput.addEventListener('input', onFloorChange);
            this.laborFloorLevelInput.addEventListener('change', onFloorChange);
            this.laborExtraInputs = {};
            this.loadLaborBySectors(container);
            // After rendering, compute prices for current labor floor
            this.updateLaborPricesForFloor(this.laborFloorLevel || 1);
        } else {
            resources.forEach(resource => {
                this.createPriceItem(resource, container, type);
            });
        }

        // Add event listeners to price inputs and unit selects
        container.querySelectorAll('.price-input').forEach(input => {
            // Clear input on focus for easier typing
            input.addEventListener('focus', (e) => {
                e.target.select();
            });
            
            input.addEventListener('input', (e) => {
                const resourceName = e.target.dataset.resource;
                const newPrice = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                const currentUnit = this.customUnits.get(resourceName);
                const resource = this.getResourceInfo(resourceName);
                
                if (resource && currentUnit && currentUnit !== resource.Unit) {
                    // If we're in alternative unit, convert back to default unit for storage
                    const defaultPrice = this.convertFromAltUnitToDefault(resourceName, newPrice, currentUnit, resource.Unit);
                    this.setCustomPrice(resourceName, defaultPrice);
                } else {
                    this.setCustomPrice(resourceName, newPrice);
                }
                
                // If labor item with extra-per-floor, update the baseline to keep user-entered price fixed for current floor
                const isLabor = e.target.dataset.type === 'labor';
                if (isLabor && this.isLaborWithFloorExtra(resourceName)) {
                    const priceInputEl = e.target;
                    const row = priceInputEl.closest('tr');
                    const extraEl = row ? row.querySelector('.extra-per-floor-input') : null;
                    const floorLevel = parseInt(this.laborFloorLevelInput ? this.laborFloorLevelInput.value : '1') || 1;
                    const extra = extraEl ? (parseFloat(extraEl.value) || 0) : 0;
                    // Compute base for floor 1 so that current shown price remains fixed when changing floors
                    const computedBaseForFloor1 = newPrice - extra * (floorLevel - 1);
                    priceInputEl.dataset.base = isNaN(computedBaseForFloor1) ? '0' : String(computedBaseForFloor1);
                }
                
                this.updateUnitOptions(resourceName, this.customPrices.get(resourceName));
                this.calculate(); // Recalculate immediately
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
        });

        container.querySelectorAll('.unit-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const resourceName = e.target.dataset.resource;
                const newUnit = e.target.value;
                this.setCustomUnit(resourceName, newUnit);
                
                // Update the price input to show the price for the selected unit
                this.updatePriceForSelectedUnit(resourceName, newUnit);
                
                this.calculate(); // Recalculate immediately
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
        });
    }

    loadMaterialsBySectors(container) {
        // Define sections
        const sections = [
            { title: 'خامات أساسية' },
            { title: 'خامات بورسلين' },
            { title: 'خامات عزل' },
            { title: 'خامات نقاشة' },
            { title: 'خامات كهرباء' },
            { title: 'خامات سباكة' }
        ];

        // Create sections
        sections.forEach(section => {
            const sectionElement = this.createSectorSection(section.title);
            container.appendChild(sectionElement);
        });
    }

    loadWorkmanshipBySectors(container) {
        // Define sections
        const sections = [
            { title: 'مصنعيات مدنية' },
            { title: 'مصنعية تأسيس تكييف' },
            { title: 'مصنعية عزل' },
            { title: 'مصنعية بورسلين' },
            { title: 'مصنعية جبسوم بورد' },
            { title: 'مصنعية نقاشة' },
            { title: 'مصنعية كهرباء' },
            { title: 'مصنعية سباكة' }
        ];

        // Create sections
        sections.forEach(section => {
            const sectionElement = this.createSectorSection(section.title);
            container.appendChild(sectionElement);
        });
    }

    loadLaborBySectors(container) {
        // Define sections
        const sections = [
            { title: 'معدات' },
            { title: 'عمالة' }
        ];

        // Create sections
        sections.forEach(section => {
            const sectionElement = this.createSectorSection(section.title);
            container.appendChild(sectionElement);
        });
    }

    createSectorSection(title) {
        let count = 0;
        // Determine the type of sector and get the count
        const materialsSectors = ['خامات أساسية', 'خامات بورسلين', 'خامات عزل', 'خامات نقاشة', 'خامات كهرباء', 'خامات سباكة'];
        const workmanshipSectors = ['مصنعيات مدنية', 'مصنعية تأسيس تكييف', 'مصنعية عزل', 'مصنعية بورسلين', 'مصنعية جبسوم بورد', 'مصنعية نقاشة', 'مصنعية كهرباء', 'مصنعية سباكة'];
        const laborSectors = ['معدات', 'عمالة'];
        if (materialsSectors.includes(title)) {
            count = this.getMaterialsForSector(title).length;
        } else if (workmanshipSectors.includes(title)) {
            count = this.getWorkmanshipForSector(title).length;
        } else if (laborSectors.includes(title)) {
            count = this.getLaborForSector(title).length;
        }
        const section = document.createElement('div');
        section.className = 'sector-section';
        section.innerHTML = `
            <div class="sector-header" onclick="this.parentElement.openSector()">
                <h3>${title} <span style='color:#222;font-weight:bold;font-size:1em;'>(${count})</span></h3>
                <div class="sector-toggle">
                    <span class="toggle-icon">▶</span>
                </div>
            </div>
        `;
        // Add sector functionality to the section
        section.openSector = function() {
            this.showSector(title);
        }.bind(this);
        return section;
    }

    showSector(title) {
        // Create searchable interface
        const searchInterface = document.createElement('div');
        searchInterface.className = 'search-interface';
        searchInterface.innerHTML = `
            <div class="search-content">
                <div class="search-header">
                    <h2>${title}</h2>
                    <button class="close-search" onclick="this.closest('.search-interface').remove()">×</button>
                </div>
                <div class="search-controls">
                    <input type="text" class="search-input" placeholder="ابحث عن المادة..." />
                    <button class="clear-search">مسح البحث</button>
                </div>
                <div class="search-results">
                    <table class="price-table">
                        <thead>
                            <tr>
                                <th>المادة</th>
                                <th>الوحدة الافتراضية</th>
                                <th>السعر</th>
                                <th>الوحدة البديلة</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.body.appendChild(searchInterface);
        
        // Determine if this is a materials, workmanship, or labor sector
        const materialsSectors = ['خامات أساسية', 'خامات بورسلين', 'خامات عزل', 'خامات نقاشة', 'خامات كهرباء', 'خامات سباكة'];
        const workmanshipSectors = ['مصنعيات مدنية', 'مصنعية تأسيس تكييف', 'مصنعية عزل', 'مصنعية بورسلين', 'مصنعية جبسوم بورد', 'مصنعية نقاشة', 'مصنعية كهرباء', 'مصنعية سباكة'];
        const laborSectors = ['معدات', 'عمالة'];
        
        const isMaterialsSector = materialsSectors.includes(title);
        const isWorkmanshipSector = workmanshipSectors.includes(title);
        const isLaborSector = laborSectors.includes(title);
        
        let materials = [];
        let workmanship = [];
        let labor = [];
        
        if (isMaterialsSector) {
            materials = this.getMaterialsForSector(title);
        } else if (isWorkmanshipSector) {
            workmanship = this.getWorkmanshipForSector(title);
        } else if (isLaborSector) {
            labor = this.getLaborForSector(title);
        }
        
        const tbody = searchInterface.querySelector('.price-table tbody');
        
        // Add materials
        materials.forEach(resource => {
            this.createPriceItem(resource, tbody, 'materials');
        });
        
        // Add workmanship
        workmanship.forEach(resource => {
            this.createPriceItem(resource, tbody, 'workmanship');
        });
        
        // Add labor
        labor.forEach(resource => {
            this.createPriceItem(resource, tbody, 'labor');
        });
        
        // Add search functionality
        this.addSearchFunctionality(searchInterface, materials, workmanship, labor);
        
        // Focus on search input
        setTimeout(() => {
            searchInterface.querySelector('.search-input').focus();
        }, 100);
    }

    addSearchFunctionality(searchInterface, allMaterials, allWorkmanship, allLabor) {
        const searchInput = searchInterface.querySelector('.search-input');
        const clearBtn = searchInterface.querySelector('.clear-search');
        const tbody = searchInterface.querySelector('.price-table tbody');
        
        // Search function
        const performSearch = (searchTerm) => {
            const filteredMaterials = allMaterials.filter(resource => 
                resource.Resource.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            const filteredWorkmanship = allWorkmanship.filter(resource => 
                resource.Resource.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            const filteredLabor = allLabor.filter(resource => 
                resource.Resource.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            // Clear current table
            tbody.innerHTML = '';
            
            // Add filtered materials
            filteredMaterials.forEach(resource => {
                this.createPriceItem(resource, tbody, 'materials');
            });
            
            // Add filtered workmanship
            filteredWorkmanship.forEach(resource => {
                this.createPriceItem(resource, tbody, 'workmanship');
            });
            
            // Add filtered labor
            filteredLabor.forEach(resource => {
                this.createPriceItem(resource, tbody, 'labor');
            });
            
            // Add event listeners to new items
            this.addSearchEventListeners(searchInterface);
        };
        
        // Search input event
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
        });
        
        // Clear search button
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            performSearch('');
            searchInput.focus();
        });
        
        // Add initial event listeners
        this.addSearchEventListeners(searchInterface);
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchInterface.parentNode) {
                searchInterface.remove();
            }
        });
    }

    addSearchEventListeners(searchInterface) {
        // Add event listeners to price inputs
        searchInterface.querySelectorAll('.price-input').forEach(input => {
            // Clear input on focus for easier typing
            input.addEventListener('focus', (e) => {
                e.target.select();
            });
            
            input.addEventListener('input', (e) => {
                const resourceName = e.target.dataset.resource;
                const newPrice = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                const currentUnit = this.customUnits.get(resourceName);
                const resource = this.getResourceInfo(resourceName);
                
                if (resource && currentUnit && currentUnit !== resource.Unit) {
                    // If we're in alternative unit, convert back to default unit for storage
                    const defaultPrice = this.convertFromAltUnitToDefault(resourceName, newPrice, currentUnit, resource.Unit);
                    this.setCustomPrice(resourceName, defaultPrice);
                } else {
                    this.setCustomPrice(resourceName, newPrice);
                }
                
                // If labor item with extra-per-floor, update baseline
                const isLabor = e.target.dataset.type === 'labor';
                if (isLabor && this.isLaborWithFloorExtra(resourceName)) {
                    const priceInputEl = e.target;
                    const row = priceInputEl.closest('tr');
                    const extraEl = row ? row.querySelector('.extra-per-floor-input') : null;
                    const floorLevel = parseInt(this.laborFloorLevelInput ? this.laborFloorLevelInput.value : '1') || 1;
                    const extra = extraEl ? (parseFloat(extraEl.value) || 0) : 0;
                    const computedBaseForFloor1 = newPrice - extra * (floorLevel - 1);
                    priceInputEl.dataset.base = isNaN(computedBaseForFloor1) ? '0' : String(computedBaseForFloor1);
                }
                
                this.updateUnitOptions(resourceName, this.customPrices.get(resourceName));
                this.calculate(); // Recalculate immediately
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
        });

        // Add event listeners to unit selects
        searchInterface.querySelectorAll('.unit-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const resourceName = e.target.dataset.resource;
                const newUnit = e.target.value;
                this.setCustomUnit(resourceName, newUnit);
                
                // Update the price input to show the price for the selected unit
                this.updatePriceForSelectedUnit(resourceName, newUnit);
                
                this.calculate(); // Recalculate immediately
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
        });
    }

    getMaterialsForSector(sectorTitle) {
        const sectorMaterials = {
            'خامات أساسية': [
                'أسمنت أسود', 'أسمنت أبيض', 'رمل مونة', 'رمل ردم', 'مادة لاصقة',
                'طوب أحمر 20 10 5', 'طوب طفلي 20 9 5', 'طوب طفلي 24 11 6', 'طوب مصمت دبل 24 11 11',
                'عتبة', 'زوايا', 'شبك'
            ],
            'خامات بورسلين': [
                'بلاط HDF', 'إكسسوارات'
            ],
            'خامات عزل': [
                'أديبوند', 'ألواح ميمبرين', 'برايمر', 'سيكا 107', 'فوم'
            ],
            'خامات نقاشة': [
                'مشمع', 'سيلر حراري', 'سيلر مائي', 'معجون أكريلك', 'معجون دايتون',
                'صنفرة', 'تيب', 'كرتون', 'بلاستيك 7070', 'دهانات بلاستيك'
            ],
            'خامات كهرباء': [
                'انتركم', 'بريزة دفاية', 'بريزة عادية', 'بريزة قوي', 'بواط',
                'تكييف', 'تلفاز', 'تليفون', 'ثرموستات تكييف', 'جاكوزي',
                'جرس أو شفاط', 'داتا', 'دفياتير 3 طرف', 'دفياتير 4 طرف',
                'سخان', 'سخان فوري', 'شيش حصيرة', 'صواعد 16 مل', 'صواعد تليفون',
                'صواعد دش', 'صواعد نت', 'لوحة 12 خط', 'لوحة 18 خط', 'لوحة 24 خط',
                'لوحة 36 خط', 'لوحة 48 خط', 'مخرج إضاءة', 'مخرج إضاءة درج', 'مخرج سماعة'
            ],
            'خامات سباكة': [
                'بارد', 'بيبة 15 سم', 'بيبة 30 سم', 'بيبة 65 سم', 'تأسيس خزان',
                'تأسيس غلاية', 'تأسيس موتور', 'جيت شاور', 'جيت شاور دفن',
                'خزان دفن', 'خلاط دفن 1 مخرج', 'خلاط دفن 2 مخرج', 'خلاط دفن 3 مخرج',
                'ساخن بارد', 'صرف تكييف', 'محبس دفن'
            ]
        };
        
        const materialNames = sectorMaterials[sectorTitle] || [];
        return materialsList.filter(resource => materialNames.includes(resource.Resource));
    }

    getWorkmanshipForSector(sectorTitle) {
        const sectorWorkmanship = {
            'مصنعيات مدنية': [
                'مصنعية طوب طفلي 20 9 5', 'مصنعية طوب طفلي 24 11 6', 'مصنعية طوب مصمت دبل 24 11 11', 'مصنعية طوب أحمر 20 10 5',
                'مصنعية نحاتة', 'مصنعية بياض'
            ],
            'مصنعية تأسيس تكييف': [
                'مصنعية 1.5/2.25 HP', 'مصنعية 3/4 HP', 'مصنعية 5 HP', 'مصنعية صاج'
            ],
            'مصنعية عزل': [
                'مصنعية أنسومات', 'مصنعية سيكا 107', 'مصنعية حراري'
            ],
            'مصنعية بورسلين': [
                'مصنعية بورسلين 120*60', 'مصنعية HDF', 'مصنعية وزر'
            ],
            'مصنعية جبسوم بورد': [
                'مصنعية أبيض مسطح', 'مصنعية أخضر مسطح', 'مصنعية أبيض طولي', 'مصنعية أخضر طولي',
                'مصنعية تجاليد أبيض', 'مصنعية تجاليد أخضر', 'مصنعية قواطيع أبيض', 'مصنعية قواطيع أخضر',
                'مصنعية بيوت ستائر و نور', 'مصنعية تراك ماجنتك'
            ],
            'مصنعية نقاشة': [
                'مصنعية تأسيس نقاشة حوائط', 'مصنعية تأسيس نقاشة أسقف', 'مصنعية تشطيب نقاشة'
            ],
            'مصنعية كهرباء': [
                'مصنعية مخرج إضاءة', 'مصنعية مخرج إضاءة درج', 'مصنعية دفياتير 3 طرف', 'مصنعية دفياتير 4 طرف',
                'مصنعية مخرج سماعة', 'مصنعية جرس أو شفاط', 'مصنعية بريزة عادية', 'مصنعية بريزة قوي',
                'مصنعية بريزة دفاية', 'مصنعية جاكوزي', 'مصنعية سخان', 'مصنعية سخان فوري', 'مصنعية تكييف',
                'مصنعية تليفون', 'مصنعية تلفاز', 'مصنعية داتا', 'مصنعية شيش حصيرة', 'مصنعية ثرموستات تكييف',
                'مصنعية انتركم', 'مصنعية لوحة 12 خط', 'مصنعية لوحة 18 خط', 'مصنعية لوحة 24 خط',
                'مصنعية لوحة 36 خط', 'مصنعية لوحة 48 خط', 'مصنعية صواعد 16 مل', 'مصنعية صواعد نت',
                'مصنعية صواعد تليفون', 'مصنعية صواعد دش'
            ],
            'مصنعية سباكة': [
                'مصنعية ساخن بارد', 'مصنعية بارد', 'مصنعية بيبة 15 سم', 'مصنعية بيبة 30 سم', 'مصنعية بيبة 65 سم',
                'مصنعية خزان دفن', 'مصنعية خلاط دفن 1 مخرج', 'مصنعية خلاط دفن 2 مخرج', 'مصنعية خلاط دفن 3 مخرج',
                'مصنعية جيت شاور', 'مصنعية جيت شاور دفن', 'مصنعية صرف تكييف', 'مصنعية محبس دفن',
                'مصنعية تأسيس موتور', 'مصنعية تأسيس غلاية', 'مصنعية تأسيس خزان'
            ]
        };
        const workmanshipNames = sectorWorkmanship[sectorTitle] || [];
        return workmanshipList.filter(resource => workmanshipNames.includes(resource.Resource));
    }

    getLaborForSector(sectorTitle) {
        const sectorLabor = {
            'معدات': [
                'عربية رتش', 'هيلتي'
            ],
            'عمالة': [
                'نظافة', 'تشوين', 'تشوين رمل', 'تشوين أسمنت', 'تشوين طوب',
                'تنزيل رتش', 'تشوين بورسلين', 'تشوين مادة لاصقة', 'لياسة'
            ]
        };
        
        const laborNames = sectorLabor[sectorTitle] || [];
        return laborList.filter(resource => laborNames.includes(resource.Resource));
    }

    createPriceItem(resource, container, type) {
        // Handle NaN values properly
        const unitCost = resource['Unit Cost'];
        const defaultPrice = (unitCost && !isNaN(unitCost)) ? unitCost : 0;
        const storedPrice = this.customPrices.get(resource.Resource) || defaultPrice;
        const currentUnit = this.customUnits.get(resource.Resource) || resource.Unit;
        
        // Calculate the price to display based on current unit
        let displayPrice = storedPrice;
        if (currentUnit !== resource.Unit) {
            displayPrice = this.calculateAltUnitPrice(resource.Resource, storedPrice, resource.Unit, currentUnit);
        }
        
        // Create unit options
        const unitOptions = this.createUnitOptions(resource, storedPrice, currentUnit);
        
        // Determine if we should show the unit selector
        const hasAltUnit = resource['Alt Unit'] !== null && resource['Alt Unit'] !== undefined;
        
        const row = document.createElement('tr');
        row.className = 'price-row';
        
        // If labor and resource needs extra per floor, add extra input
        if (type === 'labor' && this.isLaborWithFloorExtra(resource.Resource)) {
            row.innerHTML = `
                <td class="resource-name">${resource.Resource}</td>
                <td class="default-unit">${resource.Unit}</td>
                <td class="price-input-cell">
                    <input type="number" value="${this.formatNumber(displayPrice)}" min="0" step="0.01" placeholder="أدخل السعر" data-resource="${resource.Resource}" data-type="${type}" class="price-input" data-base="${defaultPrice}">
                </td>
                <td class="extra-per-floor-cell">
                    <input type="number" value="" min="0" step="0.01" placeholder="إضافة لكل دور" data-resource="${resource.Resource}" class="extra-per-floor-input">
                </td>
                <td class="unit-select-cell">
                    ${hasAltUnit ? `<select class="unit-select" data-resource="${resource.Resource}" data-type="${type}">${unitOptions}</select>` : '<span class="no-unit">-</span>'}
                </td>
            `;
            container.appendChild(row);
            // Store reference to extra input
            const extraInput = row.querySelector('.extra-per-floor-input');
            this.laborExtraInputs[resource.Resource] = extraInput;
            // Restore saved extra if exists
            if (this.laborExtrasPerFloor && this.laborExtrasPerFloor.hasOwnProperty(resource.Resource)) {
                extraInput.value = String(this.laborExtrasPerFloor[resource.Resource]);
            }
            // Listen for changes: save and recalc
            extraInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.laborExtrasPerFloor[resource.Resource] = isNaN(val) ? 0 : val;
                this.saveProjectLaborExtras();
                this.updateLaborPricesForFloor();
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
        } else {
            row.innerHTML = `
                <td class="resource-name">${resource.Resource}</td>
                <td class="default-unit">${resource.Unit}</td>
                <td class="price-input-cell">
                    <input type="number" value="${this.formatNumber(displayPrice)}" min="0" step="0.01" placeholder="أدخل السعر" data-resource="${resource.Resource}" data-type="${type}" class="price-input">
                </td>
                <td class="unit-select-cell">
                    ${hasAltUnit ? `<select class="unit-select" data-resource="${resource.Resource}" data-type="${type}">${unitOptions}</select>` : '<span class="item-details">-</span>'}
                </td>
            `;
            container.appendChild(row);
        }
    }

    createUnitOptions(resource, currentPrice, currentUnit) {
        const defaultUnit = resource.Unit;
        const altUnit = resource['Alt Unit'];
        
        // If no alternative unit exists, return null to indicate no selector needed
        if (!altUnit) {
            return null;
        }
        
        let options = `<option value="${defaultUnit}" ${currentUnit === defaultUnit ? 'selected' : ''}>${defaultUnit}</option>`;
        options += `<option value="${altUnit}" ${currentUnit === altUnit ? 'selected' : ''}>${altUnit}</option>`;
        
        return options;
    }

    getUnitConversionFactor(resourceName, fromUnit, toUnit) {
        const resource = this.getResourceInfo(resourceName);
        if (!resource) return 1;

        // Define conversion factors for common units
        const conversions = {
            // Cement conversions
            'أسمنت أسود': {
                'شيكارة': { 'طن': 0.05 }, // 20 bags = 1 ton
                'طن': { 'شيكارة': 20 }
            },
            'أسمنت أبيض': {
                'شيكارة': { 'طن': 0.04 }, // 25 bags = 1 ton
                'طن': { 'شيكارة': 25 }
            },
            'مادة لاصقة': {
                'شيكارة': { 'طن': 0.05 }, // 20 bags = 1 ton
                'طن': { 'شيكارة': 20 }
            },
            // Sand conversions
            'رمل مونة': {
                'م3': { 'نقلة': 0.1 }, // Approximate conversion
                'نقلة': { 'م3': 10 }
            },
            'رمل ردم': {
                'م3': { 'نقلة': 0.1 },
                'نقلة': { 'م3': 10 }
            },
            // Brick conversions
            'طوب أحمر 20 10 5': {
                'طوبة': { '1000 طوبة': 0.001 },
                '1000 طوبة': { 'طوبة': 1000 }
            },
            'طوب طفلي 20 9 5': {
                'طوبة': { '1000 طوبة': 0.001 },
                '1000 طوبة': { 'طوبة': 1000 }
            },
            'طوب طفلي 24 11 6': {
                'طوبة': { '1000 طوبة': 0.001 },
                '1000 طوبة': { 'طوبة': 1000 }
            },
            'طوب مصمت دبل 24 11 11': {
                'طوبة': { '1000 طوبة': 0.001 },
                '1000 طوبة': { 'طوبة': 1000 }
            },
            // Paint and sealant conversions
            'سيلر حراري': {
                'لتر': { 'بستلة 20 لتر': 0.05 },
                'بستلة 20 لتر': { 'لتر': 20 }
            },
            'سيلر مائي': {
                'لتر': { 'بستلة 9 لتر': 0.1111111111111111 },
                'بستلة 9 لتر': { 'لتر': 9 }
            },
            'معجون أكريلك': {
                'كيلو': { 'بستلة 15 كيلو': 0.06666666666666667 },
                'بستلة 15 كيلو': { 'كيلو': 15 }
            },
            'معجون دايتون': {
                'كيلو': { 'بستلة 15 كيلو': 0.06666666666666667 },
                'بستلة 15 كيلو': { 'كيلو': 15 }
            },
            'بلاستيك 7070': {
                'لتر': { 'بستلة 9 لتر': 0.1111111111111111 },
                'بستلة 9 لتر': { 'لتر': 9 }
            },
            'دهانات بلاستيك': {
                'لتر': { 'بستلة 9 لتر': 0.1111111111111111 },
                'بستلة 9 لتر': { 'لتر': 9 }
            }
        };

        const resourceConversions = conversions[resourceName];
        if (resourceConversions && resourceConversions[fromUnit] && resourceConversions[fromUnit][toUnit]) {
            return resourceConversions[fromUnit][toUnit];
        }

        return 1; // No conversion needed or available
    }

    convertPrice(resourceName, price, fromUnit, toUnit) {
        if (fromUnit === toUnit) return price;
        
        const conversionFactor = this.getUnitConversionFactor(resourceName, fromUnit, toUnit);
        // Ensure we don't get NaN in conversion
        const safePrice = isNaN(price) ? 0 : price;
        const safeConversionFactor = isNaN(conversionFactor) ? 1 : conversionFactor;
        return safePrice * safeConversionFactor;
    }

    calculateAltUnitPrice(resourceName, defaultPrice, defaultUnit, altUnit) {
        // Specific conversion factors based on user requirements
        const conversions = {
            // Cement: bag price x number of bags per ton
            'أسمنت أسود': {
                'شيكارة': { 'طن': 20 },
                'طن': { 'شيكارة': 0.05 }
            },
            'أسمنت أبيض': {
                'شيكارة': { 'طن': 25 },
                'طن': { 'شيكارة': 0.04 }
            },
            'مادة لاصقة': {
                'شيكارة': { 'طن': 20 },
                'طن': { 'شيكارة': 0.05 }
            },
            // Sand: نقلة = 3 م3 (price scaling)
            'رمل مونة': {
                'م3': { 'نقلة': 3 },
                'نقلة': { 'م3': 0.3333333333333333 }
            },
            'رمل ردم': {
                'م3': { 'نقلة': 3 },
                'نقلة': { 'م3': 0.3333333333333333 }
            },
            // Paint and sealant conversions
            'سيلر حراري': {
                'لتر': { 'بستلة 20 لتر': 20 },
                'بستلة 20 لتر': { 'لتر': 0.05 }
            },
            'سيلر مائي': {
                'لتر': { 'بستلة 9 لتر': 9 },
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            'معجون أكريلك': {
                'كيلو': { 'بستلة 15 كيلو': 15 },
                'بستلة 15 كيلو': { 'كيلو': 0.06666666666666667 }
            },
            'معجون دايتون': {
                'كيلو': { 'بستلة 15 كيلو': 15 },
                'بستلة 15 كيلو': { 'كيلو': 0.06666666666666667 }
            },
            'بلاستيك 7070': {
                'لتر': { 'بستلة 9 لتر': 9 },
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            'دهانات بلاستيك': {
                'لتر': { 'بستلة 9 لتر': 9 },
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            // Brick conversions
            'طوب أحمر 20 10 5': {
                'طوبة': { '1000 طوبة': 1000 },
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب طفلي 20 9 5': {
                'طوبة': { '1000 طوبة': 1000 },
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب طفلي 24 11 6': {
                'طوبة': { '1000 طوبة': 1000 },
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب مصمت دبل 24 11 11': {
                'طوبة': { '1000 طوبة': 1000 },
                '1000 طوبة': { 'طوبة': 0.001 }
            }
        };

        const resourceConversions = conversions[resourceName];
        if (resourceConversions && resourceConversions[defaultUnit] && resourceConversions[defaultUnit][altUnit]) {
            const conversionFactor = resourceConversions[defaultUnit][altUnit];
            // Ensure we don't get NaN in calculation
            const safeDefaultPrice = isNaN(defaultPrice) ? 0 : defaultPrice;
            return safeDefaultPrice * conversionFactor;
        }

        // Ensure we don't return NaN
        return isNaN(defaultPrice) ? 0 : defaultPrice; // No conversion available
    }

    convertFromAltUnitToDefault(resourceName, altUnitPrice, altUnit, defaultUnit) {
        // Specific conversion factors for converting from alternative unit back to default unit
        const conversions = {
            // Cement: ton price back to bag price
            'أسمنت أسود': {
                'طن': { 'شيكارة': 0.05 }
            },
            'أسمنت أبيض': {
                'طن': { 'شيكارة': 0.04 }
            },
            'مادة لاصقة': {
                'طن': { 'شيكارة': 0.05 }
            },
            // Sand: if نقلة price is x, then م3 price is x/3
            'رمل مونة': {
                'نقلة': { 'م3': 0.3333333333333333 }
            },
            'رمل ردم': {
                'نقلة': { 'م3': 0.3333333333333333 }
            },
            // Paint and sealant conversions
            'سيلر حراري': {
                'بستلة 20 لتر': { 'لتر': 0.05 }
            },
            'سيلر مائي': {
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            'معجون أكريلك': {
                'بستلة 15 كيلو': { 'كيلو': 0.06666666666666667 }
            },
            'معجون دايتون': {
                'بستلة 15 كيلو': { 'كيلو': 0.06666666666666667 }
            },
            'بلاستيك 7070': {
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            'دهانات بلاستيك': {
                'بستلة 9 لتر': { 'لتر': 0.1111111111111111 }
            },
            // Brick conversions
            'طوب أحمر 20 10 5': {
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب طفلي 20 9 5': {
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب طفلي 24 11 6': {
                '1000 طوبة': { 'طوبة': 0.001 }
            },
            'طوب مصمت دبل 24 11 11': {
                '1000 طوبة': { 'طوبة': 0.001 }
            }
        };

        const resourceConversions = conversions[resourceName];
        if (resourceConversions && resourceConversions[altUnit] && resourceConversions[altUnit][defaultUnit]) {
            const conversionFactor = resourceConversions[altUnit][defaultUnit];
            // Ensure we don't get NaN in calculation
            const safeAltUnitPrice = isNaN(altUnitPrice) ? 0 : altUnitPrice;
            return safeAltUnitPrice * conversionFactor;
        }

        // Ensure we don't return NaN
        return isNaN(altUnitPrice) ? 0 : altUnitPrice; // No conversion available
    }

    updateUnitOptions(resourceName, newPrice) {
        // Find all unit selects for this resource and update their options
        const unitSelects = document.querySelectorAll(`.unit-select[data-resource="${resourceName}"]`);
        
        unitSelects.forEach(select => {
            const resource = this.getResourceInfo(resourceName);
            if (resource && resource['Alt Unit']) {
                const defaultUnit = resource.Unit;
                const altUnit = resource['Alt Unit'];
                const currentUnit = this.customUnits.get(resourceName) || defaultUnit;
                
                // Calculate alternative unit price
                const altUnitPrice = this.calculateAltUnitPrice(resourceName, newPrice, defaultUnit, altUnit);
                
                // Update the options
                select.innerHTML = `
                    <option value="${defaultUnit}" ${currentUnit === defaultUnit ? 'selected' : ''}>${defaultUnit}</option>
                    <option value="${altUnit}" ${currentUnit === altUnit ? 'selected' : ''}>${altUnit}</option>
                `;
            }
        });
    }

    updatePriceForSelectedUnit(resourceName, selectedUnit) {
        const resource = this.getResourceInfo(resourceName);
        if (!resource) return;

        const defaultUnit = resource.Unit;
        // Handle NaN values properly
        const customPrice = this.customPrices.get(resourceName);
        const unitCost = resource['Unit Cost'];
        const defaultPrice = customPrice || ((unitCost && !isNaN(unitCost)) ? unitCost : 0);
        
        // Find all price inputs for this resource
        const priceInputs = document.querySelectorAll(`.price-input[data-resource="${resourceName}"]`);
        
        priceInputs.forEach(input => {
            let displayPrice;
            
            if (selectedUnit === defaultUnit) {
                // Show default unit price
                displayPrice = defaultPrice;
            } else {
                // Show alternative unit price
                displayPrice = this.calculateAltUnitPrice(resourceName, defaultPrice, defaultUnit, selectedUnit);
            }
            
            // Update the input value - ensure we don't get NaN
            const safeDisplayPrice = isNaN(displayPrice) ? 0 : displayPrice;
            input.value = this.formatNumber(safeDisplayPrice);

            // If labor with extra-per-floor, re-pin base so displayed price remains fixed for current floor
            const isLabor = input.dataset.type === 'labor';
            if (isLabor && this.isLaborWithFloorExtra(resourceName)) {
                const row = input.closest('tr');
                const extraEl = row ? row.querySelector('.extra-per-floor-input') : null;
                const floorLevel = parseInt(this.laborFloorLevelInput ? this.laborFloorLevelInput.value : '1') || 1;
                const extra = extraEl ? (parseFloat(extraEl.value) || 0) : 0;
                const computedBaseForFloor1 = safeDisplayPrice - extra * (floorLevel - 1);
                input.dataset.base = isNaN(computedBaseForFloor1) ? '0' : String(computedBaseForFloor1);
            }
        });
    }

    setupEventListeners() {
        this.mainItemSelect.addEventListener('change', () => {
            const selectedMainItem = this.mainItemSelect.value;
            if (selectedMainItem) {
                this.loadSubItems(selectedMainItem);
            } else {
                this.subItemSelect.innerHTML = '<option value="">-- اختر البند الفرعي --</option>';
                this.subItemSelect.disabled = true;
            }
            this.calculate();
        });

        this.subItemSelect.addEventListener('change', () => {
            this.calculate();
        });

        this.quantityInput.addEventListener('focus', (e) => {
            e.target.select();
        });
        
        this.quantityInput.addEventListener('input', () => {
            this.calculate();
        });

        // Waste percent input event
        if (this.wastePercentInput) {
            this.wastePercentInput.addEventListener('input', () => {
                this.calculate();
            });
        }

        // Operation percent input event
        if (this.operationPercentInput) {
            this.operationPercentInput.addEventListener('input', () => {
                this.calculate();
            });
        }

        // Setup tab functionality
        this.setupTabs();

        // Accordion logic
        const accordionSections = [
            { header: this.materialsHeader, body: this.materialsBody },
            { header: this.workmanshipHeader, body: this.workmanshipBody },
            { header: this.laborHeader, body: this.laborBody },
        ];
        accordionSections.forEach(({ header, body }) => {
            if (!header || !body) return;
            const toggleBtn = header.querySelector('.accordion-toggle');
            const toggle = () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                if (expanded) {
                    body.style.display = 'none';
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.textContent = '+';
                } else {
                    body.style.display = 'block';
                    toggleBtn.setAttribute('aria-expanded', 'true');
                    toggleBtn.textContent = '−';
                }
            };
            // Collapse by default
            body.style.display = 'none';
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.textContent = '+';
            header.addEventListener('click', (e) => {
                // Only toggle if not clicking inside a button/input
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
                    toggle();
                }
            });
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle();
            });
        });

        if (this.saveItemBtn) {
            this.saveItemBtn.addEventListener('click', () => this.saveCurrentItemToSummary());
        }
        if (this.summaryUndoBtn) {
            this.summaryUndoBtn.addEventListener('click', () => this.undoLastDelete());
        }

        // Update quantity input placeholder/unit live
        const updateQuantityUnit = () => {
            const mainItem = this.mainItemSelect.value;
            const subItem = this.subItemSelect.value;
            const unit = this.getCorrectUnit(mainItem, subItem);
            if (this.quantityInput) {
                this.quantityInput.placeholder = unit ? `أدخل الكمية (${unit})` : 'أدخل الكمية';
            }
        };
        if (this.mainItemSelect) this.mainItemSelect.addEventListener('change', updateQuantityUnit);
        if (this.subItemSelect) this.subItemSelect.addEventListener('change', updateQuantityUnit);

        if (this.resourceTypeFilter) {
            this.resourceTypeFilter.addEventListener('change', () => this.renderResourcesSummary());
        }
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }

    getResourceInfo(resourceName, preferredType = null) {
        // If we have a preferred type, try to find the resource in that specific list first
        if (preferredType) {
            let targetList;
            if (preferredType === 'خامات') {
                targetList = materialsList;
            } else if (preferredType === 'مصنعيات') {
                targetList = workmanshipList;
            } else if (preferredType === 'عمالة') {
                targetList = laborList;
            }
            
            if (targetList) {
                const resource = targetList.find(resource => resource.Resource === resourceName);
                if (resource) {
                    return resource;
                }
            }
        }
        
        // Fallback to the combined list
        return this.resourcesList.find(resource => resource.Resource === resourceName);
    }

    getResourcePrice(resourceName, preferredType = null) {
        const resourceInfo = this.getResourceInfo(resourceName, preferredType);
        if (!resourceInfo) return 0;

        // Always use default unit for calculations, regardless of display unit
        // This ensures consistent calculations even when alternative units are displayed
        const defaultUnit = resourceInfo.Unit;

        // Get the price in the default unit
        let price;
        if (this.customPrices.has(resourceName)) {
            // Custom prices are always stored in default unit
            price = this.customPrices.get(resourceName);
        } else {
            // Handle NaN values properly
            const unitCost = resourceInfo['Unit Cost'];
            price = (unitCost && !isNaN(unitCost)) ? unitCost : 0;
        }

        return price;
    }

    getResourceUnit(resourceName, preferredType = null) {
        const resourceInfo = this.getResourceInfo(resourceName, preferredType);
        if (!resourceInfo) return '';

        // Return the display unit (custom unit if set, otherwise default unit)
        // This is used for display purposes only, calculations always use default unit
        return this.customUnits.get(resourceName) || resourceInfo.Unit;
    }

    calculate() {
        const mainItem = this.mainItemSelect.value;
        const subItem = this.subItemSelect.value;
        const quantity = parseFloat(this.quantityInput.value) || 0;
        const wastePercent = this.wastePercentInput ? (parseFloat(this.wastePercentInput.value) || 0) : 0;
        const operationPercent = this.operationPercentInput ? (parseFloat(this.operationPercentInput.value) || 0) : 0;

        if (!mainItem || !subItem || quantity <= 0) {
            this.totalCostElement.textContent = '0.00';
            this.resultsSection.style.display = 'none';
            // Update resources totals even when no calculation
            this.updateResourcesTotals();
            return;
        }

        // Get all items that match the selected main and sub item
        const matchingItems = itemsList.filter(item => 
            item['Main Item'] === mainItem && 
            item['Sub Item'] === subItem
        );

        if (matchingItems.length === 0) {
            this.totalCostElement.textContent = '0.00';
            this.resultsSection.style.display = 'none';
            // Update resources totals even when no matching items
            this.updateResourcesTotals();
            return;
        }

        // Group items by type (خامات, مصنعيات, عمالة)
        const materials = [];
        const workmanship = [];
        const labor = [];

        matchingItems.forEach(item => {
            const resourceInfo = this.getResourceInfo(item.Resource, item.Type);
            if (resourceInfo) {
                const unitPrice = this.getResourcePrice(item.Resource, item.Type);
                // Use custom rate if set, otherwise default
                const rateKey = `${mainItem}||${subItem}||${item.Resource}`;
                const itemQuantity = this.customRates[rateKey] !== undefined ? parseFloat(this.customRates[rateKey]) : (parseFloat(item['Quantity per Unit']) || 0);
                const totalQuantity = itemQuantity * quantity;
                // Ensure we don't get NaN in calculations
                const safeUnitPrice = isNaN(unitPrice) ? 0 : unitPrice;
                const totalCost = safeUnitPrice * totalQuantity;
                // Always use default unit for calculations, but show custom unit for display
                const defaultUnit = resourceInfo.Unit;
                const displayUnit = this.getResourceUnit(item.Resource, item.Type);

                const itemData = {
                    resource: item.Resource,
                    quantity: totalQuantity,
                    unit: displayUnit, // Show the selected unit for display
                    unitPrice: safeUnitPrice,
                    totalCost: totalCost,
                    type: resourceInfo.Type,
                    rateKey,
                    rate: itemQuantity,
                    defaultRate: parseFloat(item['Quantity per Unit']) || 0
                };

                if (resourceInfo.Type === 'خامات') {
                    materials.push(itemData);
                } else if (resourceInfo.Type === 'مصنعيات') {
                    workmanship.push(itemData);
                } else if (resourceInfo.Type === 'عمالة') {
                    labor.push(itemData);
                }
            }
        });

        // Calculate totals
        const materialsTotal = materials.reduce((sum, item) => sum + item.totalCost, 0);
        const workmanshipTotal = workmanship.reduce((sum, item) => sum + item.totalCost, 0);
        const laborTotal = labor.reduce((sum, item) => sum + item.totalCost, 0);
        let baseTotal = materialsTotal + workmanshipTotal + laborTotal;

        // Apply waste percent to base, then add operation percent on base only
        let grandTotal = (baseTotal * (1 + wastePercent / 100)) + (baseTotal * (operationPercent / 100));

        // Update display with formatted numbers
        this.totalCostElement.textContent = this.formatNumber(grandTotal);
        this.resultsSection.style.display = 'block';

        // Update tables
        this.updateTable(this.materialsTable, materials, 'خامات');
        this.updateTable(this.workmanshipTable, workmanship, 'مصنعيات');
        this.updateTable(this.laborTable, labor, 'عمالة');

        // Update accordion headers with description and totals
        if (this.materialsDesc && this.materialsTotal) {
            this.materialsDesc.textContent = `عدد البنود: ${materials.length}`;
            this.materialsTotal.textContent = `${this.formatNumber(materialsTotal)} جنيه`;
        }
        if (this.workmanshipDesc && this.workmanshipTotal) {
            this.workmanshipDesc.textContent = `عدد البنود: ${workmanship.length}`;
            this.workmanshipTotal.textContent = `${this.formatNumber(workmanshipTotal)} جنيه`;
        }
        if (this.laborDesc && this.laborTotal) {
            this.laborDesc.textContent = `عدد البنود: ${labor.length}`;
            this.laborTotal.textContent = `${this.formatNumber(laborTotal)} جنيه`;
        }

        // Calculate unit price for display
        let unitPrice = 0;
        let unit = '';
        if (quantity > 0 && grandTotal > 0) {
            unitPrice = grandTotal / quantity;
            unit = this.getCorrectUnit(mainItem, subItem);
        }
        if (this.unitPriceDisplay) {
            if (unitPrice > 0 && unit) {
                this.unitPriceDisplay.innerHTML = `<span class="label">تكلفة الوحدة:</span> <span class="value">${this.formatNumber(unitPrice)} جنيه / ${unit}</span>`;
            } else {
                this.unitPriceDisplay.textContent = '';
            }
        }

        // Update summary total
        this.updateSummaryTotal();
        
        // Update resources totals - ALWAYS call this
        this.updateResourcesTotals();
        
        // Store the calculated unit price for use in summary cards
        this.lastCalculatedUnitPrice = unitPrice;
        this.lastCalculatedUnit = unit;
    }

    updateTable(tableBody, items, type) {
        tableBody.innerHTML = '';

        // Add table header
        const thead = tableBody.parentElement.querySelector('thead');
        if (thead) {
            thead.innerHTML = `<tr>
                <th>الخامة</th>
                <th>معدل الاستخدام</th>
                <th>الكمية المطلوبة</th>
                <th>الوحدة</th>
                <th>سعر الوحدة</th>
                <th>التكلفة</th>
            </tr>`;
        }

        if (items.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'لا توجد عناصر';
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            return;
        }

        let total = 0;
        items.forEach(item => {
            const row = tableBody.insertRow();
            const resourceCell = row.insertCell();
            resourceCell.textContent = item.resource;
            // Editable rate input
            const rateCell = row.insertCell();
            rateCell.style.textAlign = 'center';
            rateCell.innerHTML = `
                <input type="number" class="rate-input" value="${this.formatRate(item.rate)}" min="0" step="0.0001" style="width:70px;"> 
                <button class="rate-default-btn" title="الافتراضي" style="margin-right:4px;">↺</button>
            `;
            // Add event listeners
            const rateInput = rateCell.querySelector('.rate-input');
            const defaultBtn = rateCell.querySelector('.rate-default-btn');
            rateInput.addEventListener('input', (e) => {
                this.customRates[item.rateKey] = e.target.value;
                this.saveProjectCustomRates();
                this.calculate();
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
            defaultBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.customRates[item.rateKey] = this.formatRate(item.defaultRate);
                this.saveProjectCustomRates();
                this.calculate();
                // Update resources totals ribbon live
                this.updateResourcesTotals();
            });
            // الكمية المطلوبة
            const quantityCell = row.insertCell();
            quantityCell.textContent = this.formatNumber(item.quantity);
            // الوحدة
            const unitCell = row.insertCell();
            unitCell.textContent = item.unit;
            // سعر الوحدة
            const unitPriceCell = row.insertCell();
            unitPriceCell.textContent = `${this.formatNumber(item.unitPrice)} جنيه`;
            // التكلفة
            const totalCostCell = row.insertCell();
            totalCostCell.textContent = `${this.formatNumber(item.totalCost)} جنيه`;
            total += isNaN(item.totalCost) ? 0 : item.totalCost;
        });

        // Add total row at the bottom
        const totalRow = tableBody.insertRow();
        totalRow.style.fontWeight = 'bold';
        const labelCell = totalRow.insertCell();
        labelCell.colSpan = 5;
        if (type === 'خامات') {
            labelCell.textContent = 'إجمالي الخامات';
        } else if (type === 'مصنعيات') {
            labelCell.textContent = 'إجمالي المصنعيات';
        } else if (type === 'عمالة') {
            labelCell.textContent = 'إجمالي العمالة';
        } else {
            labelCell.textContent = 'الإجمالي';
        }
        const totalValueCell = totalRow.insertCell();
        totalValueCell.textContent = `${this.formatNumber(total)} جنيه`;
    }

    // Helper to check if resource needs extra per floor
    isLaborWithFloorExtra(resourceName) {
        return [
            'تشوين أسمنت',
            'تشوين رمل',
            'تشوين طوب',
            'تشوين مادة لاصقة',
        ].includes(resourceName);
    }

    // Update prices for labor items when floor level changes (labor-only)
    updateLaborPricesForFloor(previousFloorLevel) {
        try {
        const currentFloor = (this.laborFloorLevelInput && this.laborFloorLevelInput.value)
            ? (parseInt(this.laborFloorLevelInput.value) || 1)
            : (this.laborFloorLevel || 1);
        const prevFloor = previousFloorLevel || currentFloor;
            
            // Update this.laborFloorLevel to keep it in sync
            this.laborFloorLevel = currentFloor;
            
        // 1) Update visible inputs if present
        Object.entries(this.laborExtraInputs).forEach(([resourceName, extraInput]) => {
            const priceInput = document.querySelector(`.price-input[data-resource='${resourceName}'][data-type='labor']`);
            let extra = parseFloat(extraInput.value);
            if (isNaN(extra)) {
                extra = (this.laborExtrasPerFloor && this.laborExtrasPerFloor.hasOwnProperty(resourceName)) ? (parseFloat(this.laborExtrasPerFloor[resourceName]) || 0) : 0;
                extraInput.value = String(extra);
            }
            if (priceInput) {
                const baseFromDataset = parseFloat(priceInput.dataset.base);
                const base = !isNaN(baseFromDataset) ? baseFromDataset : ((parseFloat(priceInput.value) || 0) - extra * (prevFloor - 1));
                const newPrice = base + extra * (currentFloor - 1);
                    priceInput.value = this.formatNumber(isNaN(newPrice) ? 0 : newPrice);
                    this.setCustomPrice(resourceName, parseFloat(priceInput.value.replace(/,/g, '')) || 0);
            }
        });
            
        // 2) Update stored prices even if inputs are not mounted (using previous stored price as baseline)
        Object.keys(this.laborExtrasPerFloor || {}).forEach(resourceName => {
            const extra = parseFloat(this.laborExtrasPerFloor[resourceName]) || 0;
            // Get currently stored default-unit price for this resource
            const storedPrice = this.getResourcePrice(resourceName, 'عمالة');
            if (storedPrice !== undefined && storedPrice !== null) {
                const base = storedPrice - extra * (prevFloor - 1);
                const newPrice = base + extra * (currentFloor - 1);
                this.setCustomPrice(resourceName, isNaN(newPrice) ? 0 : newPrice);
            }
        });
            
            // Save the current floor level to project data
            this.saveProjectLaborFloorLevel();
            
        this.calculate();
            this.updateResourcesTotals();
            
        } catch (error) {
            console.error('Error updating labor prices for floor:', error);
        }
    }

    saveCurrentItemToSummary() {
        // Get current selection and calculation
        const mainItem = this.mainItemSelect.value;
        const subItem = this.subItemSelect.value;
        const quantity = parseFloat(this.quantityInput.value) || 0;
        const total = parseFloat(this.totalCostElement.textContent.replace(/,/g, '')) || 0;
        if (!mainItem || !subItem || quantity <= 0 || total <= 0) return;
        
        // Use the stored unit price from the calculation for consistency
        const unitPrice = this.lastCalculatedUnitPrice || (total / quantity);
        const unit = this.lastCalculatedUnit || this.getCorrectUnit(mainItem, subItem);
        
        // Create card data
        const cardData = {
            id: Date.now() + Math.random(),
            mainItem,
            subItem,
            quantity,
            unit,
            total,
            unitPrice
        };
        this.addSummaryCard(cardData);
    }

    addSummaryCard(cardData) {
        // Create card element
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.dataset.cardId = cardData.id;
        card.cardData = cardData;
        // Collapsible content
        card.innerHTML = `
            <div class="summary-card-header">
                <span class="expand-icon">&#9654;</span>
                <div class="item-title">${cardData.mainItem} - ${cardData.subItem}</div>
                <div class="item-details">الكمية: <span class="quantity-value">${this.formatNumber(cardData.quantity)} ${cardData.unit}</span></div>
                <div class="item-unit">تكلفة الوحدة: <span class="unit-price-value">${this.formatNumber(cardData.unitPrice)}</span> جنيه / ${cardData.unit}</div>
                <div class="item-sell-header">سعر البيع: <span class="sell-price-header">${this.formatNumber(cardData.unitPrice)}</span> جنيه / ${cardData.unit}</div>
                <div class="item-total">الإجمالي: ${this.formatNumber(cardData.total)} جنيه</div>
                <button class="delete-btn">حذف</button>
            </div>
            <div class="summary-card-body">
                <div class="card-row">
                    <div class="input-group">
                        <label>نسبة المخاطر (%)</label>
                        <input type="number" class="risk-input" min="0" step="0.01">
                    </div>
                    <div class="input-group">
                        <label>نسبة الضريبة (%)</label>
                        <input type="number" class="tax-input" min="0" step="0.01">
                    </div>
                    <div class="display-group">
                        <span class="item-unit">تكلفة الوحدة: <span class="unit-price-value">${this.formatNumber(cardData.unitPrice)}</span> جنيه / ${cardData.unit}</span>
                    </div>
                    <div class="display-group">
                        <span class="item-sell">سعر البيع: <span class="sell-price-value">${this.formatNumber(cardData.unitPrice)}</span> جنيه / ${cardData.unit}</span>
                    </div>
                </div>
            </div>
        `;
        // Expand/collapse logic
        const header = card.querySelector('.summary-card-header');
        const body = card.querySelector('.summary-card-body');
        const expandIcon = card.querySelector('.expand-icon');
        let expanded = false;
        const setExpanded = (val) => {
            expanded = val;
            if (expanded) {
                body.style.display = 'block';
                expandIcon.innerHTML = '&#9660;';
            } else {
                body.style.display = 'none';
                expandIcon.innerHTML = '&#9654;';
            }
        };
        setExpanded(false);
        header.addEventListener('click', (e) => {
            // Only toggle if not clicking delete
            if (!e.target.classList.contains('delete-btn')) setExpanded(!expanded);
        });
        // Delete logic
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            // Add to undo stack
            this.addToUndoStack({
                action: 'delete',
                cardData: cardData,
                cardElement: card,
                position: this.getCardPosition(card)
            });
            
            // Remove the card
            card.remove();
            
            // Update all totals and displays
            this.updateSummaryTotal();
            this.updateSummarySellingTotal();
            this.updateSummaryFinalTotal();
            this.updateResourcesSection();
            
            // Update resources totals ribbon immediately
            this.updateResourcesTotals();
            
            // Update project items after delete
            this.saveProjectItemsFromDOM();
            
            // Show undo button
            if (this.summaryUndoBtn) this.summaryUndoBtn.style.display = 'inline-block';
        });
        // Risk/Tax logic
        const riskInput = card.querySelector('.risk-input');
        const taxInput = card.querySelector('.tax-input');
        const unitPriceValue = card.querySelector('.unit-price-value');
        const sellPriceValue = card.querySelector('.sell-price-value');
        const sellPriceHeader = card.querySelector('.sell-price-header');
        const updateSellPrice = () => {
            const risk = parseFloat(riskInput.value) || 0;
            const tax = parseFloat(taxInput.value) || 0;
            const base = cardData.unitPrice; // Use the stored unit price
            const sell = base * (1 + risk / 100) * (1 + tax / 100);
            sellPriceValue.textContent = this.formatNumber(sell);
            sellPriceHeader.textContent = this.formatNumber(sell);
            card.dataset.sellPrice = sell;
            
            // Save risk and tax values to card data
            cardData.riskPercentage = risk;
            cardData.taxPercentage = tax;
            cardData.sellPrice = sell;
            
            this.updateSummaryTotal();
            // Update resources totals ribbon live
            this.updateResourcesTotals();
            // Update final total
            this.updateSummaryFinalTotal();
            
            // Save project data to persist the changes
            this.saveProjectItemsFromDOM();
        };
        riskInput.addEventListener('input', updateSellPrice);
        taxInput.addEventListener('input', updateSellPrice);
        
        // Restore saved risk and tax values if they exist
        if (cardData.riskPercentage !== undefined) {
            riskInput.value = cardData.riskPercentage;
        }
        if (cardData.taxPercentage !== undefined) {
            taxInput.value = cardData.taxPercentage;
        }
        
        // Set initial sell price in dataset for summary total
        if (cardData.sellPrice !== undefined) {
            card.dataset.sellPrice = cardData.sellPrice;
        } else {
        card.dataset.sellPrice = cardData.unitPrice;
        }
        
        // Calculate initial sell price if risk/tax values exist
        if (cardData.riskPercentage !== undefined || cardData.taxPercentage !== undefined) {
            updateSellPrice();
        }
        this.summaryCards.appendChild(card);
        this.updateSummaryTotal();
        // Save all summary cards to project after add
        this.saveProjectItemsFromDOM();
        
        // Update resources totals ribbon immediately
        this.updateResourcesTotals();
        
                // Update final total
        this.updateSummaryFinalTotal();

        // Add 'عرض التفاصيل' button to summary card
        const detailsBtn = document.createElement('button');
        detailsBtn.textContent = 'عرض التفاصيل';
        detailsBtn.className = 'details-btn';
        detailsBtn.style.marginRight = '12px';
        detailsBtn.onclick = (e) => {
            e.stopPropagation();
            this.showItemDetailsModal(cardData);
        };
        header.insertBefore(detailsBtn, header.firstChild);
    }

    // Add to undo stack
    addToUndoStack(actionData) {
        this.undoStack.push(actionData);
        
        // Keep only last N actions
        if (this.undoStack.length > this.maxUndoActions) {
            this.undoStack.shift();
        }
        
        // Update undo button text
        this.updateUndoButtonText();
    }

    // Get card position for undo
    getCardPosition(card) {
        const cards = Array.from(this.summaryCards.querySelectorAll('.summary-card'));
        return cards.indexOf(card);
    }

    // Undo last action
    undoLastDelete() {
        if (this.undoStack.length === 0) return;
        
        const lastAction = this.undoStack.pop();
        
        if (lastAction.action === 'delete') {
            // Restore the card
            if (lastAction.position >= 0 && lastAction.position < this.summaryCards.children.length) {
                // Insert at specific position
                const targetCard = this.summaryCards.children[lastAction.position];
                if (targetCard) {
                    this.summaryCards.insertBefore(lastAction.cardElement, targetCard);
                } else {
                    this.summaryCards.appendChild(lastAction.cardElement);
                }
            } else {
                // Append to end if position is invalid
                this.summaryCards.appendChild(lastAction.cardElement);
            }
            
            // Update all totals and displays
            this.updateSummaryTotal();
            this.updateSummarySellingTotal();
            this.updateSummaryFinalTotal();
            this.updateResourcesSection();
            
            // Update resources totals ribbon immediately
            this.updateResourcesTotals();
            
            // Save project items
            this.saveProjectItemsFromDOM();
        }
        
        // Update undo button text
        this.updateUndoButtonText();
        
        // Hide undo button if no more actions
        if (this.undoStack.length === 0 && this.summaryUndoBtn) {
            this.summaryUndoBtn.style.display = 'none';
        }
    }

    // Update undo button text to show count
    updateUndoButtonText() {
        if (this.summaryUndoBtn) {
            const count = this.undoStack.length;
            if (count > 0) {
                this.summaryUndoBtn.textContent = `تراجع (${count})`;
            } else {
                this.summaryUndoBtn.textContent = 'تراجع';
            }
        }
    }

    saveProjectItemsFromDOM() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        const proj = this.projects[this.currentProjectId];
        proj.items = Array.from(this.summaryCards.querySelectorAll('.summary-card')).map(card => card.cardData);
        this.saveProjects();
    }

    updateSummaryTotal() {
        try {
            // Sum all visible cards' unit costs (تكلفة الوحدة)
        let total = 0;
            const cards = this.summaryCards.querySelectorAll('.summary-card');
            
            cards.forEach((card, index) => {
                try {
                    const unitCost = parseFloat(card.cardData?.unitPrice) || 0;
                    const quantity = parseFloat(card.cardData?.quantity) || 0;
                    const cardTotal = unitCost * quantity;
                    total += cardTotal;
                    
                    if (isNaN(cardTotal)) {
                        console.warn(`Card ${index + 1} has invalid calculation:`, { unitCost, quantity, cardTotal });
                    }
                } catch (cardError) {
                    console.error(`Error processing card ${index + 1}:`, cardError);
                }
            });
            
        if (this.summaryTotal) {
                this.summaryTotal.innerHTML = `<span class="total-value">${this.formatNumber(total)}</span>`;
            } else {
                console.warn('summaryTotal element not found');
            }
            
            // Also update the selling total
            this.updateSummarySellingTotal();
            
        } catch (error) {
            console.error('Error updating summary total:', error);
        }
    }

    updateSummarySellingTotal() {
        try {
            // Sum all visible cards' selling prices (سعر البيع) after risk and tax
            let sellingTotal = 0;
            const cards = this.summaryCards.querySelectorAll('.summary-card');
            
            cards.forEach((card, index) => {
                try {
                    const sell = parseFloat(card.dataset.sellPrice) || parseFloat(card.cardData?.unitPrice) || 0;
                    const quantity = parseFloat(card.cardData?.quantity) || 0;
                    const cardTotal = sell * quantity;
                    sellingTotal += cardTotal;
                    
                    if (isNaN(cardTotal)) {
                        console.warn(`Card ${index + 1} has invalid selling calculation:`, { sell, quantity, cardTotal });
                    }
                } catch (cardError) {
                    console.error(`Error processing selling for card ${index + 1}:`, cardError);
                }
            });
            
            if (this.summarySellingTotal) {
                this.summarySellingTotal.innerHTML = `<span class="selling-total-value">${this.formatNumber(sellingTotal)}</span>`;
            } else {
                console.warn('summarySellingTotal element not found');
            }
            
            // Also update the final total
            this.updateSummaryFinalTotal();
            
        } catch (error) {
            console.error('Error updating selling total:', error);
        }
    }

    updateSummaryFinalTotal() {
        try {
            // Get the selling total
            let sellingTotal = 0;
            const cards = this.summaryCards.querySelectorAll('.summary-card');
            
            cards.forEach((card, index) => {
                try {
                    const sellPrice = parseFloat(card.dataset.sellPrice) || parseFloat(card.cardData?.unitPrice) || 0;
                    const quantity = parseFloat(card.cardData?.quantity) || 0;
                    const cardTotal = sellPrice * quantity;
                    sellingTotal += cardTotal;
                    
                    if (isNaN(cardTotal)) {
                        console.warn(`Card ${index + 1} has invalid final calculation:`, { sellPrice, quantity, cardTotal });
                    }
                } catch (cardError) {
                    console.error(`Error processing final for card ${index + 1}:`, cardError);
                }
            });
            
            // Apply supervision percentage
            const supervisionPercent = parseFloat(this.supervisionPercentage?.value) || 0;
            const finalTotal = sellingTotal * (1 + supervisionPercent / 100);
            
            if (this.summaryFinalTotal) {
                this.summaryFinalTotal.innerHTML = `<span class="final-total-value">${this.formatNumber(finalTotal)}</span>`;
            } else {
                console.warn('summaryFinalTotal element not found');
            }
            
        } catch (error) {
            console.error('Error updating final total:', error);
        }
    }

    // Determine the correct unit for a given main/sub item based on user rules
    getCorrectUnit(mainItem, subItem) {
        // Normalize main item: trim and strip leading definite article 'ال'
        const normalize = (s) => (s || '').trim().replace(/^ال\s*/,'');
        // Arabic normalization: remove diacritics/tatweel and unify Alef/Hamza/Yaa/Ta Marbuta
        const normalizeArabic = (s) => (s || '')
            .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel + tatweel
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/[ؤئء]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const mainNorm = normalize(mainItem);
        const subNorm = (subItem || '').trim();
        const mainNormN = normalizeArabic(mainNorm);
        const subNormN = normalizeArabic(subNorm);
        // Helper for substring match
        const contains = (str, arr) => arr.some(s => str.includes(s));
        const containsN = (str, arr) => arr.some(s => str.includes(normalizeArabic(s)));
        // Special cases for بورسلين
        if (mainItem.includes('بورسلين') || mainNorm.includes('بورسلين') || mainNormN.includes('بورسلين')) {
            if (subNormN.includes('وزر')) return 'مط';
            return 'م2';
        }
        // Special cases for جبسوم بورد
        if (mainItem.includes('جبسوم بورد') || mainNorm.includes('جبسوم بورد') || mainNormN.includes('جبسوم بورد')) {
            const mtSubs = ['ابيض طولي', 'أبيض طولي', 'اخضر طولي', 'أخضر طولي', 'بيوت ستاير', 'بيوت ستائر', 'نور', 'ماجنتك', 'ماجنتك تراك', 'تراك ماجنتك'];
            if (containsN(subNormN, mtSubs)) return 'مط';
            return 'م2';
        }
        // Special cases for تأسيس كهرباء
        if (mainItem.includes('تأسيس كهرباء') || mainNorm.includes('تأسيس كهرباء') || mainNormN.includes('تاسيس كهرباء')) {
            if (subNormN.includes('صواعد')) return 'مط';
            return 'نقطة';
        }
        // Special cases for تأسيس سباكة
        if (mainItem.includes('تأسيس سباكة') || mainNorm.includes('تأسيس سباكة') || mainNormN.includes('تاسيس سباكة')) return 'نقطة';
        // Special cases for تأسيس تكييف
        if (mainItem.includes('تأسيس تكييف') || mainNorm.includes('تأسيس تكييف') || mainNorm.includes('تكييفات') || mainNormN.includes('تاسيس تكييف')) return 'مط';
        // Special cases for عزل
        if (mainItem.includes('عزل') || mainNorm.includes('عزل') || mainNormN.includes('عزل')) return 'م2';
        // المتر المسطح الافتراضي لفئات معينة (مع وبدون "ال")
        const m2MainsNormalized = ['مباني','هدم','نقاشة','نقاشه','محارة','رخام'];
        if (m2MainsNormalized.includes(mainNorm) || m2MainsNormalized.includes(mainNormN)) return 'م2';
        // Fallback: try to get from itemsList
        const matchingItems = itemsList.filter(item => item['Main Item'] === mainItem && item['Sub Item'] === subItem);
        let unit = '';
        if (matchingItems.length > 0) {
            const found = matchingItems.find(item => item.Unit && item.Unit !== '');
            unit = found ? found.Unit : (matchingItems[0].Unit || '');
        }
        return unit;
    }

    // Helper to get all resources used in saved items
    getResourcesSummary() {
        // Map: resourceName -> { type, totalAmount, totalCost, usages: [ {itemTitle, amount, cost} ] }
        const summary = {};
        // For each saved card
        this.summaryCards.querySelectorAll('.summary-card').forEach(card => {
            // Get item info
            const titleDiv = card.querySelector('.item-title');
            const itemTitle = titleDiv ? titleDiv.textContent : '';
            const quantityDiv = card.querySelector('.item-details');
            let quantity = 1;
            if (quantityDiv) {
                const match = quantityDiv.textContent.match(/الكمية:\s*([\d.]+)/);
                if (match) quantity = parseFloat(match[1]);
            }
            // Find the main/sub item in itemsList
            let mainItem = '', subItem = '';
            if (itemTitle.includes(' - ')) {
                [mainItem, subItem] = itemTitle.split(' - ');
            }
            const matchingItems = itemsList.filter(item => item['Main Item'] === mainItem && item['Sub Item'] === subItem);
            matchingItems.forEach(item => {
                const resource = item.Resource;
                const type = item.Type;
                const unit = item.Unit || '';
                const amount = (parseFloat(item['Quantity per Unit']) || 0) * quantity;
                // Get price per unit from materialsList, workmanshipList, laborList
                let pricePerUnit = 0;
                let found = null;
                found = materialsList.find(r => r.Resource === resource);
                if (!found) found = workmanshipList.find(r => r.Resource === resource);
                if (!found) found = laborList.find(r => r.Resource === resource);
                if (found && found['Unit Cost']) pricePerUnit = parseFloat(found['Unit Cost']) || 0;
                const cost = amount * pricePerUnit;
                if (!summary[resource]) {
                    summary[resource] = {
                        type,
                        unit,
                        totalAmount: 0,
                        totalCost: 0,
                        usages: []
                    };
                }
                summary[resource].totalAmount += amount;
                summary[resource].totalCost += cost;
                summary[resource].usages.push({ itemTitle, amount, cost, unit });
            });
        });
        return summary;
    }

    // Replace renderResourcesSummary and updateResourcesSection with new logic for three collapsible panels
    renderResourcesAccordion() {
        // Get summary by resource
        const summary = this.getResourcesSummary();
        // Prepare categorized lists
        const categories = {
            'خامات': [],
            'مصنعيات': [],
            'عمالة': []
        };
        Object.entries(summary).forEach(([resource, data]) => {
            if (categories[data.type]) {
                categories[data.type].push({ resource, data });
            }
        });
        
        // Sort each category by total cost (highest to lowest)
        Object.keys(categories).forEach(category => {
            categories[category].sort((a, b) => {
                const totalCostA = a.data.usages.reduce((sum, u) => sum + u.cost, 0);
                const totalCostB = b.data.usages.reduce((sum, u) => sum + u.cost, 0);
                return totalCostB - totalCostA; // High to low
            });
        });
        
        // Helper to render resource rows for a category
        const renderRows = (list) =>
            list.map(({ resource, data }, index) => {
                // Calculate totals for this resource
                const totalCost = data.usages.reduce((sum, u) => sum + u.cost, 0);
                const totalQuantity = data.usages.reduce((sum, u) => sum + u.amount, 0);
                
                return `<div class="resource-row" data-rank="${index + 1}">
                    <div class="resource-header">
                    <span class="resource-name">${resource}</span>
                        <div class="resource-totals">
                            <span class="total-cost">
                                <span class="label">إجمالي التكلفة:</span>
                                <span class="value">${this.formatNumber(totalCost)} جنيه</span>
                            </span>
                            <span class="total-quantity">
                                <span class="label">إجمالي الكمية:</span>
                                <span class="value">${this.formatNumber(totalQuantity)} ${data.unit}</span>
                            </span>
                        </div>
                    </div>
                    <div class="resource-usage-details">
                        <table class="resource-usage-table">
                            <thead>
                                <tr>
                                    <th>البند</th>
                                    <th>الكمية</th>
                                    <th>التكلفة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.usages.map(u => `
                                    <tr>
                                        <td class="usage-item-title">${u.itemTitle}</td>
                                        <td class="usage-amount">${this.formatNumber(u.amount)} ${u.unit}</td>
                                        <td class="usage-cost">${this.formatNumber(u.cost)} جنيه</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            }).join('');
        
        // Render each panel with sorting info
        if (this.resourcesMaterialsBody) {
            this.resourcesMaterialsBody.innerHTML = renderRows(categories['خامات']);
        }
        if (this.resourcesWorkmanshipBody) {
            this.resourcesWorkmanshipBody.innerHTML = renderRows(categories['مصنعيات']);
        }
        if (this.resourcesLaborBody) {
            this.resourcesLaborBody.innerHTML = renderRows(categories['عمالة']);
        }
    }

    updateResourcesSection() {
        this.renderResourcesAccordion();
        [
            { header: this.resourcesMaterialsHeader, body: this.resourcesMaterialsBody },
            { header: this.resourcesWorkmanshipHeader, body: this.resourcesWorkmanshipBody },
            { header: this.resourcesLaborHeader, body: this.resourcesLaborBody }
        ].forEach(({ header, body }) => {
            if (header && body) {
                body.style.display = 'none';
                const btn = header.querySelector('.accordion-toggle');
                if (btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.textContent = '+';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const expanded = body.style.display === 'block';
                        body.style.display = expanded ? 'none' : 'block';
                        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                        btn.textContent = expanded ? '+' : '–';
                    };
                }
                header.onclick = (e) => {
                    if (e.target.classList.contains('accordion-toggle')) return;
                    const btn = header.querySelector('.accordion-toggle');
                    btn && btn.click();
                };
            }
        });
        // No grand totals update needed
    }

    // --- Project Management Logic ---
    setupProjectManagement() {
        this.projectForm.onsubmit = (e) => {
            e.preventDefault();
            const name = this.projectNameInput.value.trim();
            const code = this.projectCodeInput.value.trim();
            const type = this.projectTypeInput.value;
            const area = parseFloat(this.projectAreaInput.value);
            const floor = parseInt(this.projectFloorInput.value);
            if (!name || !code || !type || !area || !floor) return;
            // Create new project object
            const id = 'proj_' + Date.now();
            this.projects[id] = {
                name, code, type, area, floor,
                prices: { materials: {}, workmanship: {}, labor: {} },
                items: [],
                laborExtrasPerFloor: {},
                laborFloorLevel: 1
            };
            this.saveProjects();
            this.currentProjectId = id;
            this.saveCurrentProjectId();
            this.renderProjectsList();
            this.loadProjectData();
            this.projectForm.reset();
        };
        
        // Remove syncing labor floor from project floor; only save project floor and refresh display
        if (this.projectFloorInput) {
            const syncFloor = () => {
                const floorVal = parseInt(this.projectFloorInput.value) || 1;
                if (this.currentProjectId && this.projects[this.currentProjectId]) {
                    this.projects[this.currentProjectId].floor = floorVal;
                    this.saveProjects();
                    this.renderCurrentProjectDisplay();
                }
            };
            this.projectFloorInput.addEventListener('input', syncFloor);
            this.projectFloorInput.addEventListener('change', syncFloor);
        }
        
        this.renderProjectsList();
    }

    renderProjectsList() {
        this.projectsList.innerHTML = '';
        Object.entries(this.projects).forEach(([id, proj]) => {
            const div = document.createElement('div');
            div.className = 'project-list-item';
            div.innerHTML = `
                <span class="project-name">${proj.name}</span>
                <span class="project-code">(${proj.code})</span>
                <button data-id="${id}" class="select-btn project-action-btn">تحديد</button>
                <button data-id="${id}" class="delete-btn project-action-btn">حذف</button>
            `;
            // Select
            div.querySelector('.select-btn').onclick = () => {
                this.currentProjectId = id;
                this.saveCurrentProjectId();
                this.loadProjectData();
                this.renderProjectsList();
            };
            // Delete
            div.querySelector('.delete-btn').onclick = () => {
                if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
                    delete this.projects[id];
                    if (this.currentProjectId === id) {
                        this.currentProjectId = Object.keys(this.projects)[0] || null;
                        this.saveCurrentProjectId();
                    }
                    this.saveProjects();
                    this.renderProjectsList();
                    this.loadProjectData();
                }
            };
            if (this.currentProjectId === id) {
                div.style.background = 'var(--bg-tertiary)';
            }
            this.projectsList.appendChild(div);
        });
        // Show current project
        this.renderCurrentProjectDisplay();
    }

    renderCurrentProjectDisplay() {
        const proj = this.projects[this.currentProjectId];
        if (proj) {
            this.currentProjectDisplay.innerHTML = `
                <div class="current-project-main">
                    <span class="project-name">${proj.name}</span>
                    <span class="project-code">(${proj.code})</span>
                </div>
                <div class="current-project-sub">
                    <span class="project-type"><span class="label">النوع:</span> <span class="value">${proj.type}</span></span>
                    <span class="sep">•</span>
                    <span class="project-area"><span class="label">المساحة:</span> <span class="value">${this.formatNumber(proj.area)} م²</span></span>
                    <span class="sep">•</span>
                    <span class="project-floor"><span class="label">الأدوار:</span> <span class="value">${proj.floor}</span></span>
                </div>
            `;
        } else {
            this.currentProjectDisplay.innerHTML = '<span>لا يوجد مشروع محدد</span>';
        }
    }

    // --- Project Data Storage ---
    loadProjects() {
        try {
            return JSON.parse(localStorage.getItem('projects')) || {};
        } catch {
            return {};
        }
    }
    saveProjects() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }
    loadCurrentProjectId() {
        return localStorage.getItem('currentProjectId') || Object.keys(this.projects)[0] || null;
    }
    saveCurrentProjectId() {
        localStorage.setItem('currentProjectId', this.currentProjectId || '');
    }

    // --- Project Data Context ---
    loadProjectData() {
        // Clear undo stack when loading new project
        this.clearUndoStack();
        
        // Show current project info
        this.renderCurrentProjectDisplay();
        // If no project, clear UI
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
            this.clearProjectUI();
            return;
        }
        // Load prices and items for this project
        const proj = this.projects[this.currentProjectId];
        // 1. Prices
        this.customPrices = new Map(Object.entries(proj.prices && proj.prices.customPrices || {}));
        this.customUnits = new Map(Object.entries(proj.prices && proj.prices.customUnits || {}));
        // 1.b Labor extras per floor and labor floor level
        this.laborExtrasPerFloor = Object.assign({}, proj.laborExtrasPerFloor || {});
        this.laborFloorLevel = proj.laborFloorLevel || 1;
        // 2. Summary items
        this.summaryCards.innerHTML = '';
        (proj.items || []).forEach(cardData => this.addSummaryCard(cardData));
        // 3. Labor floor level
        if (this.laborFloorLevelInput) {
            this.laborFloorLevelInput.value = proj.floor || 1;
            this.updateLaborPricesForFloor();
        }
        // 4. Reset calculator inputs
        if (this.mainItemSelect) this.mainItemSelect.value = '';
        if (this.subItemSelect) {
            this.subItemSelect.value = '';
            this.subItemSelect.disabled = true;
        }
        if (this.quantityInput) this.quantityInput.value = '';
        if (this.wastePercentInput) this.wastePercentInput.value = '';
        if (this.operationPercentInput) this.operationPercentInput.value = '';
        if (this.unitPriceDisplay) this.unitPriceDisplay.textContent = '';
        if (this.totalCostElement) this.totalCostElement.textContent = '0.00';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
        // 5. Prices section
        this.loadPricesSection();
        // 6. Recalculate and update all UI
        this.calculate();
        this.updateSummaryTotal();
        this.updateResourcesSection();
        // Load custom rates for this project
        this.customRates = (proj.customRates || {});
    }

    // Clear undo stack
    clearUndoStack() {
        this.undoStack = [];
        this.updateUndoButtonText();
        if (this.summaryUndoBtn) {
            this.summaryUndoBtn.style.display = 'none';
        }
    }

    clearProjectUI() {
        this.summaryCards.innerHTML = '';
        if (this.laborFloorLevelInput) this.laborFloorLevelInput.value = 1;
        if (this.mainItemSelect) this.mainItemSelect.value = '';
        if (this.subItemSelect) {
            this.subItemSelect.value = '';
            this.subItemSelect.disabled = true;
        }
        if (this.quantityInput) this.quantityInput.value = '';
        if (this.wastePercentInput) this.wastePercentInput.value = '';
        if (this.operationPercentInput) this.operationPercentInput.value = '';
        if (this.unitPriceDisplay) this.unitPriceDisplay.textContent = '';
        if (this.totalCostElement) this.totalCostElement.textContent = '0.00';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
        this.loadPricesSection();
        this.updateSummaryTotal();
        this.updateResourcesSection();
        this.calculate();
        
        // Clear undo stack
        this.clearUndoStack();
    }

    // Override price and unit setters to save to project
    setCustomPrice(resourceName, newPrice) {
        this.customPrices.set(resourceName, newPrice);
        this.saveProjectPrices();
    }
    setCustomUnit(resourceName, newUnit) {
        this.customUnits.set(resourceName, newUnit);
        this.saveProjectPrices();
    }
    saveProjectPrices() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        this.projects[this.currentProjectId].prices = {
            customPrices: Object.fromEntries(this.customPrices),
            customUnits: Object.fromEntries(this.customUnits)
        };
        this.saveProjects();
    }

    saveProjectCustomRates() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        this.projects[this.currentProjectId].customRates = this.customRates;
        this.saveProjects();
    }

    saveProjectLaborExtras() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        this.projects[this.currentProjectId].laborExtrasPerFloor = this.laborExtrasPerFloor;
        this.saveProjects();
    }
    saveProjectLaborFloorLevel() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        
        this.projects[this.currentProjectId].laborFloorLevel = this.laborFloorLevel;
        this.saveProjects();
        
        console.log('Saved labor floor level to project:', this.laborFloorLevel);
    }

    // Helper to format rates to up to 4 decimal places, removing trailing zeros
    formatRate(val) {
        return parseFloat(val).toFixed(4).replace(/\.0+$|0+$/,'').replace(/\.$/, '');
    }

    // Show item details modal for a summary card
    showItemDetailsModal(cardData) {
        if (!this.itemDetailsModal) return;
        // Set modal title
        this.itemDetailsTitle.textContent = `تفاصيل البند: ${cardData.mainItem} - ${cardData.subItem}`;
        // Render cost details for this item
        this.itemDetailsContent.innerHTML = this.renderItemCostDetails(cardData);
        this.itemDetailsModal.classList.add('show');
        this.itemDetailsModal.style.display = 'flex';
    }
    hideItemDetailsModal() {
        if (this.itemDetailsModal) {
            this.itemDetailsModal.classList.remove('show');
            this.itemDetailsModal.style.display = 'none';
        }
    }

    // Render the cost details breakdown for a summary card (returns HTML)
    renderItemCostDetails(cardData) {
        // Find the matching items for this card
        const matchingItems = itemsList.filter(item =>
            item['Main Item'] === cardData.mainItem &&
            item['Sub Item'] === cardData.subItem
        );
        if (matchingItems.length === 0) return '<div>لا توجد تفاصيل لهذا البند.</div>';
        // Use the card's quantity and current project custom rates
        const quantity = cardData.quantity;
        const customRates = this.customRates || {};
        // Group by type
        const groups = { 'خامات': [], 'مصنعيات': [], 'عمالة': [] };
        matchingItems.forEach(item => {
            const resourceInfo = this.getResourceInfo(item.Resource, item.Type);
            if (resourceInfo) {
                const unitPrice = this.getResourcePrice(item.Resource, item.Type);
                const rateKey = `${cardData.mainItem}||${cardData.subItem}||${item.Resource}`;
                const itemQuantity = customRates[rateKey] !== undefined ? parseFloat(customRates[rateKey]) : (parseFloat(item['Quantity per Unit']) || 0);
                const totalQuantity = itemQuantity * quantity;
                const safeUnitPrice = isNaN(unitPrice) ? 0 : unitPrice;
                const totalCost = safeUnitPrice * totalQuantity;
                const displayUnit = this.getResourceUnit(item.Resource, item.Type);
                groups[item.Type].push({
                    resource: item.Resource,
                    rate: this.formatRate(itemQuantity),
                    quantity: totalQuantity,
                    unit: displayUnit,
                    unitPrice: safeUnitPrice,
                    totalCost: totalCost
                });
            }
        });
        // Helper to render a group table
        const renderTable = (arr) => {
            if (!arr.length) return '';
            let total = arr.reduce((sum, x) => sum + x.totalCost, 0);
            return `
                <table>
                    <thead>
                        <tr>
                            <th>المورد</th>
                            <th>معدل الاستخدام</th>
                            <th>الكمية المطلوبة</th>
                            <th>الوحدة</th>
                            <th>سعر الوحدة</th>
                            <th>التكلفة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${arr.map(x => `
                            <tr>
                                <td>${x.resource}</td>
                                <td>${x.rate}</td>
                                <td>${this.formatNumber(x.quantity)} ${x.unit}</td>
                                <td>${x.unit}</td>
                                <td>${this.formatNumber(x.unitPrice)} جنيه</td>
                                <td>${this.formatNumber(x.totalCost)} جنيه</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight:bold;">
                            <td colspan="5">الإجمالي</td>
                            <td>${this.formatNumber(total)} جنيه</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        };
        // Accordion items
        const accordionItems = [
            { key: 'خامات', label: 'الخامات' },
            { key: 'مصنعيات', label: 'المصنعيات' },
            { key: 'عمالة', label: 'العمالة' }
        ].map(({key, label}, idx) => {
            const hasData = groups[key].length > 0;
            return `
                <div class="accordion-item">
                    <div class="accordion-header" data-idx="${idx}">
                        <span class="section-title">${label}</span>
                        <button class="accordion-toggle" aria-expanded="false">+</button>
                    </div>
                    <div class="accordion-body" style="display:none;">
                        ${hasData ? renderTable(groups[key]) : '<div style="color:#888;">لا توجد بيانات</div>'}
                    </div>
                </div>
            `;
        }).join('');
        // Modal accordion wrapper
        setTimeout(() => {
            // Add expand/collapse logic after modal content is rendered
            const modal = document.getElementById('itemDetailsModal');
            if (!modal) return;
            modal.querySelectorAll('.modal-accordion .accordion-header').forEach(header => {
                const btn = header.querySelector('.accordion-toggle');
                const body = header.parentElement.querySelector('.accordion-body');
                if (btn && body) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const expanded = body.style.display === 'block';
                        body.style.display = expanded ? 'none' : 'block';
                        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                        btn.textContent = expanded ? '+' : '–';
                    };
                    header.onclick = (e) => {
                        if (e.target.classList.contains('accordion-toggle')) return;
                        btn.click();
                    };
                    // Collapsed by default
                    body.style.display = 'none';
                    btn.setAttribute('aria-expanded', 'false');
                    btn.textContent = '+';
                }
            });
        }, 0);
        return `<div class="modal-accordion">${accordionItems}</div>`;
    }




    exportProjectToExcel() {
        try {
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                alert('مكتبة Excel غير محملة. يرجى التأكد من تحميل الصفحة بشكل صحيح.');
            return;
        }

            // Test basic XLSX functionality
            try {
                const testWb = XLSX.utils.book_new();
                const testData = [['Test', 'Data']];
                const testSheet = XLSX.utils.aoa_to_sheet(testData);
                XLSX.utils.book_append_sheet(testWb, testSheet, 'Test');
                console.log('Basic XLSX functionality test passed');
            } catch (testError) {
                console.error('Basic XLSX functionality test failed:', testError);
                alert('مشكلة في مكتبة Excel. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
                return;
            }

        // Get current project
        const proj = this.projects[this.currentProjectId];
        if (!proj) {
            alert('لا يوجد مشروع محدد.');
            return;
        }

            // Check if required elements exist
            if (!this.summaryCards) {
                alert('عناصر الصفحة غير جاهزة. يرجى المحاولة مرة أخرى.');
                return;
            }

            console.log('Starting Excel export for project:', proj.name);

            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Set workbook-level RTL
            wb.Workbook = {
                Views: [
                    {
                        RTL: true
                    }
                ]
            };

            // Get the resources summary data once for all sheets
            const resourcesSummary = this.getResourcesSummary();
            console.log('Resources summary for export:', resourcesSummary);
            
            if (!resourcesSummary || Object.keys(resourcesSummary).length === 0) {
                console.warn('No resources data found for export');
            }

            // 1. Project Overview Sheet (معلومات المشروع)
            const projectData = [
                ['معلومات المشروع', ''],
                ['اسم المشروع', proj.name],
                ['كود المشروع', proj.code],
                ['نوع المشروع', proj.type],
                ['المساحة', `${this.formatNumber(proj.area)} م²`],
                ['عدد الأدوار', proj.floor],
                ['', ''],
                ['تاريخ التصدير', new Date().toISOString().split('T')[0]],
                ['وقت التصدير', new Date().toTimeString().split(' ')[0]]
            ];

            const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
            projectSheet['!rtl'] = true;
            
            // Set column widths for project sheet
            projectSheet['!cols'] = [
                { width: 25 },
                { width: 35 }
            ];

            XLSX.utils.book_append_sheet(wb, projectSheet, 'معلومات المشروع');
            console.log('Project overview sheet added');

            // 2. Materials Sheet (الخامات)
            if (this.resourcesMaterialsBody) {
                console.log('Processing materials sheet...');
                
                const materialsData = [
                    ['إدارة الموارد - الخامات', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['اسم المورد', 'الوحدة', 'الكمية', 'سعر الوحدة (جنيه)', 'التكلفة الإجمالية (جنيه)', 'ملاحظات'],
                    ['', '', '', '', '']
                ];

                // Get the actual data from the summary instead of parsing DOM
                const resourcesSummary = this.getResourcesSummary();
                const materialsResources = Object.entries(resourcesSummary).filter(([resource, data]) => data.type === 'خامات');
                
                console.log('Materials resources from summary:', materialsResources);
                
                materialsResources.forEach(([resource, data]) => {
                    try {
                        const resourceName = resource;
                        const unit = data.unit || '';
                        const actualQuantity = this.formatNumber(data.totalAmount);
                        
                        // Calculate unit price from total cost / total amount
                        let unitPrice = '';
                        if (data.totalAmount > 0) {
                            unitPrice = this.formatNumber(data.totalCost / data.totalAmount);
                        }
                        
                        const totalCost = this.formatNumber(data.totalCost) + ' جنيه';

                        console.log(`Adding material: ${resourceName}, unit: ${unit}, quantity: ${actualQuantity}, unitPrice: ${unitPrice}, totalCost: ${totalCost}`);
                        
                        materialsData.push([resourceName, unit, actualQuantity, unitPrice, totalCost, '']);
                    } catch (error) {
                        console.error('Error processing material resource:', error);
                    }
                });

                // Add totals section
                const materialsTotal = this.calculateSectionTotal(this.resourcesMaterialsBody);
                materialsData.push(['', '', '', '', '', '']);
                materialsData.push(['', '', '', '', '', '']);
                materialsData.push(['إجمالي تكلفة الخامات', '', '', '', materialsTotal, '']);
                materialsData.push(['', '', '', '', '', '']);
                materialsData.push(['ملاحظات', 'تشمل جميع المواد الأساسية المطلوبة للمشروع', '', '', '', '']);

                const materialsSheet = XLSX.utils.aoa_to_sheet(materialsData);
                materialsSheet['!rtl'] = true;
                materialsSheet['!cols'] = [
                    { width: 35 }, // اسم المورد
                    { width: 15 }, // الوحدة
                    { width: 15 }, // الكمية
                    { width: 25 }, // سعر الوحدة
                    { width: 30 }, // التكلفة الإجمالية
                    { width: 25 }  // ملاحظات
                ];

                XLSX.utils.book_append_sheet(wb, materialsSheet, 'الخامات');
                console.log('Materials sheet added');
            }

            // 3. Workmanship Sheet (المصنعيات)
            if (this.resourcesWorkmanshipBody) {
                console.log('Processing workmanship sheet...');
                
                const workmanshipData = [
                    ['إدارة الموارد - المصنعيات', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['اسم المورد', 'الوحدة', 'الكمية', 'سعر الوحدة (جنيه)', 'التكلفة الإجمالية (جنيه)', 'ملاحظات'],
                    ['', '', '', '', '']
                ];

                // Get the actual data from the summary instead of parsing DOM
                const workmanshipResources = Object.entries(resourcesSummary).filter(([resource, data]) => data.type === 'مصنعيات');
                
                console.log('Workmanship resources from summary:', workmanshipResources);
                
                workmanshipResources.forEach(([resource, data]) => {
                    try {
                        const resourceName = resource;
                        const unit = data.unit || '';
                        const actualQuantity = this.formatNumber(data.totalAmount);
                        
                        // Calculate unit price from total cost / total amount
                        let unitPrice = '';
                        if (data.totalAmount > 0) {
                            unitPrice = this.formatNumber(data.totalCost / data.totalAmount);
                        }
                        
                        const totalCost = this.formatNumber(data.totalCost) + ' جنيه';

                        console.log(`Adding workmanship: ${resourceName}, unit: ${unit}, quantity: ${actualQuantity}, unitPrice: ${unitPrice}, totalCost: ${totalCost}`);
                        
                        workmanshipData.push([resourceName, unit, actualQuantity, unitPrice, totalCost, '']);
                    } catch (error) {
                        console.error('Error processing workmanship resource:', error);
                    }
                });

                // Add totals section
                const workmanshipTotal = this.calculateSectionTotal(this.resourcesWorkmanshipBody);
                workmanshipData.push(['', '', '', '', '', '']);
                workmanshipData.push(['', '', '', '', '', '']);
                workmanshipData.push(['إجمالي تكلفة المصنعيات', '', '', '', workmanshipTotal, '']);
                workmanshipData.push(['', '', '', '', '', '']);
                workmanshipData.push(['ملاحظات', 'تشمل جميع المصنعيات والمنتجات الجاهزة', '', '', '', '']);

                const workmanshipSheet = XLSX.utils.aoa_to_sheet(workmanshipData);
                workmanshipSheet['!rtl'] = true;
                workmanshipSheet['!cols'] = [
                    { width: 35 }, // اسم المورد
                    { width: 15 }, // الوحدة
                    { width: 15 }, // الكمية
                    { width: 25 }, // سعر الوحدة
                    { width: 30 }, // التكلفة الإجمالية
                    { width: 25 }  // ملاحظات
                ];

                XLSX.utils.book_append_sheet(wb, workmanshipSheet, 'المصنعيات');
                console.log('Workmanship sheet added');
            }

            // 4. Labor Sheet (العمالة)
            if (this.resourcesLaborBody) {
                console.log('Processing labor sheet...');
                
                const laborData = [
                    ['إدارة الموارد - العمالة', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['', '', '', '', '', ''],
                    ['اسم المورد', 'الوحدة', 'الكمية', 'سعر الوحدة (جنيه)', 'التكلفة الإجمالية (جنيه)', 'ملاحظات'],
                    ['', '', '', '', '']
                ];

                // Get the actual data from the summary instead of parsing DOM
                const laborResources = Object.entries(resourcesSummary).filter(([resource, data]) => data.type === 'عمالة');
                
                console.log('Labor resources from summary:', laborResources);
                
                laborResources.forEach(([resource, data]) => {
                    try {
                        const resourceName = resource;
                        const unit = data.unit || '';
                        const actualQuantity = this.formatNumber(data.totalAmount);
                        
                        // Calculate unit price from total cost / total amount
                        let unitPrice = '';
                        if (data.totalAmount > 0) {
                            unitPrice = this.formatNumber(data.totalCost / data.totalAmount);
                        }
                        
                        const totalCost = this.formatNumber(data.totalCost) + ' جنيه';

                        console.log(`Adding labor: ${resourceName}, unit: ${unit}, quantity: ${actualQuantity}, unitPrice: ${unitPrice}, totalCost: ${totalCost}`);
                        
                        laborData.push([resourceName, unit, actualQuantity, unitPrice, totalCost, '']);
                    } catch (error) {
                        console.error('Error processing labor resource:', error);
                    }
                });

                // Add totals section
                const laborTotal = this.calculateSectionTotal(this.resourcesLaborBody);
                laborData.push(['', '', '', '', '', '']);
                laborData.push(['', '', '', '', '', '']);
                laborData.push(['إجمالي تكلفة العمالة', '', '', '', laborTotal, '']);
                laborData.push(['', '', '', '', '', '']);
                laborData.push(['ملاحظات', 'تشمل جميع خدمات العمالة والتنفيذ', '', '', '', '']);

                const laborSheet = XLSX.utils.aoa_to_sheet(laborData);
                laborSheet['!rtl'] = true;
                laborSheet['!cols'] = [
                    { width: 35 }, // اسم المورد
                    { width: 15 }, // الوحدة
                    { width: 15 }, // الكمية
                    { width: 25 }, // سعر الوحدة
                    { width: 30 }, // التكلفة الإجمالية
                    { width: 25 }  // ملاحظات
                ];

                XLSX.utils.book_append_sheet(wb, laborSheet, 'العمالة');
                console.log('Labor sheet added');
            }

            // 5. Summary Sheet (الملخص)
            console.log('Processing summary sheet...');
            const summaryData = [
                ['ملخص المشروع - البنود', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['البند الرئيسي', 'البند الفرعي', 'الكمية', 'الوحدة', 'سعر الوحدة (جنيه)', 'التكلفة الإجمالية (جنيه)'],
                ['', '', '', '', '', '']
            ];

            // Add summary cards data
            const summaryCards = this.summaryCards.querySelectorAll('.summary-card');
            console.log('Found summary cards:', summaryCards.length);
            
            summaryCards.forEach(card => {
                try {
                    const cardData = card.cardData;
                    if (cardData) {
                        summaryData.push([
                            cardData.mainItem || '',
                            cardData.subItem || '',
                            this.formatNumber(cardData.quantity) || '',
                            cardData.unit || '',
                            this.formatNumber(cardData.unitPrice) || '',
                            this.formatNumber(cardData.total) || ''
                        ]);
                    }
                } catch (error) {
                    console.error('Error processing summary card:', error);
                }
            });

            // Add summary totals
            const summaryTotal = this.calculateSummaryTotal();
            const summarySellingTotal = this.calculateSummarySellingTotal();
            const summaryFinalTotal = this.calculateSummaryFinalTotal();

            summaryData.push(['', '', '', '', '', '']);
            summaryData.push(['', '', '', '', '', '']);
            summaryData.push(['إجمالي التكلفة الأساسية', '', '', '', '', summaryTotal]);
            summaryData.push(['إجمالي سعر البيع', '', '', '', '', summarySellingTotal]);
            summaryData.push(['إجمالي سعر البيع النهائي', '', '', '', '', summaryFinalTotal]);
            summaryData.push(['', '', '', '', '', '']);
            summaryData.push(['ملاحظات', 'تشمل جميع بنود المشروع مع حسابات المخاطر والضرائب', '', '', '', '']);

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            summarySheet['!rtl'] = true;
            summarySheet['!cols'] = [
                { width: 25 }, // البند الرئيسي
                { width: 25 }, // البند الفرعي
                { width: 15 }, // الكمية
                { width: 15 }, // الوحدة
                { width: 25 }, // سعر الوحدة
                { width: 30 }  // التكلفة الإجمالية
            ];

            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');
            console.log('Summary sheet added');

            // 6. Totals Overview Sheet (الإجماليات)
            console.log('Processing totals sheet...');
            const totalsData = [
                ['إجماليات المشروع - ملخص شامل', ''],
                ['', ''],
                ['', ''],
                ['تفاصيل التكاليف', 'المبلغ (جنيه)'],
                ['', ''],
                ['إجمالي تكلفة الخامات', this.getSectionTotalDisplay('resourcesMaterialsTotal')],
                ['إجمالي تكلفة المصنعيات', this.getSectionTotalDisplay('resourcesWorkmanshipTotal')],
                ['إجمالي تكلفة العمالة', this.getSectionTotalDisplay('resourcesLaborTotal')],
                ['', ''],
                ['المجموع الكلي للموارد', this.getSectionTotalDisplay('resourcesGrandTotal')],
                ['', ''],
                ['إجمالي التكلفة الأساسية', summaryTotal],
                ['إجمالي سعر البيع', summarySellingTotal],
                ['إجمالي سعر البيع النهائي', summaryFinalTotal],
                ['', ''],
                ['ملاحظات', 'تم حساب جميع التكاليف بناءً على البيانات المدخلة في النظام']
            ];

            const totalsSheet = XLSX.utils.aoa_to_sheet(totalsData);
            totalsSheet['!rtl'] = true;
            totalsSheet['!cols'] = [
                { width: 40 },
                { width: 30 }
            ];

            XLSX.utils.book_append_sheet(wb, totalsSheet, 'الإجماليات');
            console.log('Totals sheet added');

            // Set default row height for all sheets
            if (wb.Sheets && typeof wb.Sheets === 'object') {
                Object.keys(wb.Sheets).forEach(sheetName => {
                    if (wb.Sheets[sheetName]) {
                        wb.Sheets[sheetName]['!rows'] = Array(50).fill({ hpt: 20 });
                    }
                });
            }

            console.log('All sheets prepared, starting download...');

            // Download the file
            const fileName = `${proj.name || 'مشروع'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            console.log('File downloaded successfully:', fileName);
            
            // Success message
            alert(`تم تصدير المشروع بنجاح إلى ملف: ${fileName}`);

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Check specific conditions that might cause failure
            console.log('Debug info:', {
                hasXLSX: typeof XLSX !== 'undefined',
                hasProject: !!this.projects[this.currentProjectId],
                hasSummaryCards: !!this.summaryCards,
                hasMaterialsBody: !!this.resourcesMaterialsBody,
                hasWorkmanshipBody: !!this.resourcesWorkmanshipBody,
                hasLaborBody: !!this.resourcesLaborBody
            });
            
            alert('حدث خطأ أثناء التصدير إلى Excel. يرجى المحاولة مرة أخرى.\n\nالتفاصيل: ' + error.message);
        }
    }

    // Add this function after updateSummaryTotal
    updateResourcesTotals() {
        try {
            // Read totals directly from the resource management section
            let materialsTotal = 0;
            let workmanshipTotal = 0;
            let laborTotal = 0;
            
            // Get totals from the actual resource management display
            if (this.resourcesMaterialsBody) {
                const materialRows = this.resourcesMaterialsBody.querySelectorAll('.resource-row');
                materialRows.forEach((row, index) => {
                    try {
                        const totalCostEl = row.querySelector('.total-cost .value');
                        if (totalCostEl) {
                            const costText = totalCostEl.textContent;
                            const cost = parseFloat(costText.replace(/[^\d.-]/g, '')) || 0;
                            materialsTotal += cost;
                            
                            if (isNaN(cost)) {
                                console.warn(`Material row ${index + 1} has invalid cost:`, costText);
                            }
                        }
                    } catch (rowError) {
                        console.error(`Error processing material row ${index + 1}:`, rowError);
                    }
                });
            }
            
            if (this.resourcesWorkmanshipBody) {
                const workmanshipRows = this.resourcesWorkmanshipBody.querySelectorAll('.resource-row');
                workmanshipRows.forEach((row, index) => {
                    try {
                        const totalCostEl = row.querySelector('.total-cost .value');
                        if (totalCostEl) {
                            const costText = totalCostEl.textContent;
                            const cost = parseFloat(costText.replace(/[^\d.-]/g, '')) || 0;
                            workmanshipTotal += cost;
                            
                            if (isNaN(cost)) {
                                console.warn(`Workmanship row ${index + 1} has invalid cost:`, costText);
                            }
                        }
                    } catch (rowError) {
                        console.error(`Error processing workmanship row ${index + 1}:`, rowError);
                    }
                });
            }
            
            if (this.resourcesLaborBody) {
                const laborRows = this.resourcesLaborBody.querySelectorAll('.resource-row');
                laborRows.forEach((row, index) => {
                    try {
                        const totalCostEl = row.querySelector('.total-cost .value');
                        if (totalCostEl) {
                            const costText = totalCostEl.textContent;
                            const cost = parseFloat(costText.replace(/[^\d.-]/g, '')) || 0;
                            laborTotal += cost;
                            
                            if (isNaN(cost)) {
                                console.warn(`Labor row ${index + 1} has invalid cost:`, costText);
                            }
                        }
                    } catch (rowError) {
                        console.error(`Error processing labor row ${index + 1}:`, rowError);
                    }
                });
            }
            
        const grandTotal = materialsTotal + workmanshipTotal + laborTotal;
        
            // Update display elements with formatted numbers
        const materialsEl = document.getElementById('resourcesMaterialsTotal');
        const workmanshipEl = document.getElementById('resourcesWorkmanshipTotal');
        const laborEl = document.getElementById('resourcesLaborTotal');
        const grandEl = document.getElementById('resourcesGrandTotal');
        
            if (materialsEl) materialsEl.textContent = this.formatNumber(materialsTotal) + ' جنيه';
            if (workmanshipEl) workmanshipEl.textContent = this.formatNumber(workmanshipTotal) + ' جنيه';
            if (laborEl) laborEl.textContent = this.formatNumber(laborTotal) + ' جنيه';
            if (grandEl) grandEl.textContent = this.formatNumber(grandTotal) + ' جنيه';
            
        } catch (error) {
            console.error('Error updating resources totals:', error);
        }
    }

    // Helper function to calculate section total
    calculateSectionTotal(sectionBody) {
        try {
        let total = 0;
            const rows = sectionBody.querySelectorAll('.resource-row');
            rows.forEach(row => {
                try {
                    const totalCostEl = row.querySelector('.total-cost .value');
                    if (totalCostEl) {
                        const costText = totalCostEl.textContent;
                        const cost = parseFloat(costText.replace(/[^\d.-]/g, '')) || 0;
                        total += cost;
                    }
                } catch (error) {
                    console.error('Error calculating row cost:', error);
                }
            });
            return this.formatNumber(total) + ' جنيه';
        } catch (error) {
            console.error('Error calculating section total:', error);
            return '0.00 جنيه';
        }
    }

    // Helper function to get section total display
    getSectionTotalDisplay(elementId) {
        try {
            const element = document.getElementById(elementId);
            return element ? element.textContent : '0.00 جنيه';
        } catch (error) {
            console.error('Error getting section total display:', error);
            return '0.00 جنيه';
        }
    }

    // Helper function to calculate summary total
    calculateSummaryTotal() {
        try {
            let total = 0;
            const cards = this.summaryCards.querySelectorAll('.summary-card');
            cards.forEach(card => {
                try {
                    const unitCost = parseFloat(card.cardData?.unitPrice) || 0;
                    const quantity = parseFloat(card.cardData?.quantity) || 0;
                    total += unitCost * quantity;
                } catch (error) {
                    console.error('Error calculating card total:', error);
                }
            });
            return this.formatNumber(total) + ' جنيه';
        } catch (error) {
            console.error('Error calculating summary total:', error);
            return '0.00 جنيه';
        }
    }

    // Helper function to calculate summary selling total
    calculateSummarySellingTotal() {
        try {
            let total = 0;
            const cards = this.summaryCards.querySelectorAll('.summary-card');
            cards.forEach(card => {
                try {
                    const sellPrice = parseFloat(card.dataset.sellPrice) || parseFloat(card.cardData?.unitPrice) || 0;
                    const quantity = parseFloat(card.cardData?.quantity) || 0;
                    total += sellPrice * quantity;
                } catch (error) {
                    console.error('Error calculating card selling total:', error);
                }
            });
            return this.formatNumber(total) + ' جنيه';
        } catch (error) {
            console.error('Error calculating summary selling total:', error);
            return '0.00 جنيه';
        }
    }

    // Helper function to calculate summary final total
    calculateSummaryFinalTotal() {
        try {
            const sellingTotal = parseFloat(this.calculateSummarySellingTotal().replace(/[^\d.-]/g, '')) || 0;
            const supervisionPercent = parseFloat(this.supervisionPercentage?.value) || 0;
            const finalTotal = sellingTotal * (1 + supervisionPercent / 100);
            return this.formatNumber(finalTotal) + ' جنيه';
        } catch (error) {
            console.error('Error calculating summary final total:', error);
            return '0.00 جنيه';
        }
    }

}

// Initialize the calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ConstructionCalculator();
}); 