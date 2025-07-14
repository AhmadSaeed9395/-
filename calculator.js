import { itemsList } from './items.js';
import { materialsList } from './materials.js';
import { workmanshipList } from './workmanship.js';
import { laborList } from './labor.js';

class ConstructionCalculator {
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

        // Export PDF button logic
        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportProjectToPDF();
        }
        // Export Excel button logic
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.onclick = () => this.exportProjectToExcel();
        }
    }

    setupCollapsiblePanels() {
        const panels = [
            { header: 'pricesPanelHeader', content: 'pricesPanelContent', toggle: 'pricesPanelHeader' },
            { header: 'inputPanelHeader', content: 'inputPanelContent', toggle: 'inputPanelHeader' },
            { header: 'resourcesPanelHeader', content: 'resourcesPanelContent', toggle: 'resourcesPanelHeader' }
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
        this.lastDeletedCardData = null;
        this.lastDeletedCardElement = null;
        this.unitPriceDisplay = document.getElementById('unitPriceDisplay');
    }

    loadMainItems() {
        // Get unique main items from itemsList
        const mainItems = [...new Set(itemsList.map(item => item['Main Item']))];
        
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
            floorDiv.innerHTML = `
                <label for="laborFloorLevelInput">رقم الدور:</label>
                <input type="number" id="laborFloorLevelInput" min="1" step="1" value="1" style="width: 80px; margin-left: 8px;">
            `;
            container.appendChild(floorDiv);
            this.laborFloorLevelInput = floorDiv.querySelector('#laborFloorLevelInput');
            this.laborFloorLevelInput.addEventListener('input', () => this.updateLaborPricesForFloor());
            this.laborExtraInputs = {};
            this.loadLaborBySectors(container);
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
                const newPrice = parseFloat(e.target.value) || 0;
                const currentUnit = this.customUnits.get(resourceName);
                const resource = this.getResourceInfo(resourceName);
                
                if (resource && currentUnit && currentUnit !== resource.Unit) {
                    // If we're in alternative unit, convert back to default unit for storage
                    const defaultPrice = this.convertFromAltUnitToDefault(resourceName, newPrice, currentUnit, resource.Unit);
                    this.setCustomPrice(resourceName, defaultPrice);
                } else {
                    this.setCustomPrice(resourceName, newPrice);
                }
                
                this.updateUnitOptions(resourceName, this.customPrices.get(resourceName));
                this.calculate(); // Recalculate immediately
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
                const newPrice = parseFloat(e.target.value) || 0;
                const currentUnit = this.customUnits.get(resourceName);
                const resource = this.getResourceInfo(resourceName);
                
                if (resource && currentUnit && currentUnit !== resource.Unit) {
                    // If we're in alternative unit, convert back to default unit for storage
                    const defaultPrice = this.convertFromAltUnitToDefault(resourceName, newPrice, currentUnit, resource.Unit);
                    this.setCustomPrice(resourceName, defaultPrice);
                } else {
                    this.setCustomPrice(resourceName, newPrice);
                }
                
                this.updateUnitOptions(resourceName, this.customPrices.get(resourceName));
                this.calculate(); // Recalculate immediately
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
                    <input type="number" value="${isNaN(displayPrice) ? '0.00' : displayPrice.toFixed(2)}" min="0" step="0.01" placeholder="أدخل السعر" data-resource="${resource.Resource}" data-type="${type}" class="price-input" data-base="${defaultPrice}">
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
            // Listen for changes
            extraInput.addEventListener('input', () => this.updateLaborPricesForFloor());
        } else {
            row.innerHTML = `
                <td class="resource-name">${resource.Resource}</td>
                <td class="default-unit">${resource.Unit}</td>
                <td class="price-input-cell">
                    <input type="number" value="${isNaN(displayPrice) ? '0.00' : displayPrice.toFixed(2)}" min="0" step="0.01" placeholder="أدخل السعر" data-resource="${resource.Resource}" data-type="${type}" class="price-input">
                </td>
                <td class="unit-select-cell">
                    ${hasAltUnit ? `<select class="unit-select" data-resource="${resource.Resource}" data-type="${type}">${unitOptions}</select>` : '<span class="no-unit">-</span>'}
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
                'شيكارة': { 'طن': 0.05 },
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
            // Cement: if bag price is x, then ton price is 20x
            'أسمنت أسود': {
                'شيكارة': { 'طن': 20 },
                'طن': { 'شيكارة': 0.05 }
            },
            'أسمنت أبيض': {
                'شيكارة': { 'طن': 20 },
                'طن': { 'شيكارة': 0.05 }
            },
            // Sand: نقلة = 3 م3
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
            // Cement: if ton price is x, then bag price is x/20
            'أسمنت أسود': {
                'طن': { 'شيكارة': 0.05 }
            },
            'أسمنت أبيض': {
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
            input.value = safeDisplayPrice.toFixed(2);
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

        // Update display
        this.totalCostElement.textContent = grandTotal.toFixed(2);
        this.resultsSection.style.display = 'block';

        // Update tables
        this.updateTable(this.materialsTable, materials, 'خامات');
        this.updateTable(this.workmanshipTable, workmanship, 'مصنعيات');
        this.updateTable(this.laborTable, labor, 'عمالة');

        // Update accordion headers with description and totals
        if (this.materialsDesc && this.materialsTotal) {
            this.materialsDesc.textContent = `عدد البنود: ${materials.length}`;
            this.materialsTotal.textContent = `${materialsTotal.toFixed(2)} جنيه`;
        }
        if (this.workmanshipDesc && this.workmanshipTotal) {
            this.workmanshipDesc.textContent = `عدد البنود: ${workmanship.length}`;
            this.workmanshipTotal.textContent = `${workmanshipTotal.toFixed(2)} جنيه`;
        }
        if (this.laborDesc && this.laborTotal) {
            this.laborDesc.textContent = `عدد البنود: ${labor.length}`;
            this.laborTotal.textContent = `${laborTotal.toFixed(2)} جنيه`;
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
                this.unitPriceDisplay.textContent = `تكلفة الوحدة: ${unitPrice.toFixed(2)} جنيه / ${unit}`;
            } else {
                this.unitPriceDisplay.textContent = '';
            }
        }
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
            });
            defaultBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.customRates[item.rateKey] = this.formatRate(item.defaultRate);
                this.saveProjectCustomRates();
                this.calculate();
            });
            // الكمية المطلوبة
            const quantityCell = row.insertCell();
            quantityCell.textContent = isNaN(item.quantity) ? '0.00' : item.quantity.toFixed(2);
            // الوحدة
            const unitCell = row.insertCell();
            unitCell.textContent = item.unit;
            // سعر الوحدة
            const unitPriceCell = row.insertCell();
            unitPriceCell.textContent = `${isNaN(item.unitPrice) ? '0.00' : item.unitPrice.toFixed(2)} جنيه`;
            // التكلفة
            const totalCostCell = row.insertCell();
            totalCostCell.textContent = `${isNaN(item.totalCost) ? '0.00' : item.totalCost.toFixed(2)} جنيه`;
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
        totalValueCell.textContent = `${total.toFixed(2)} جنيه`;
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

    // Update prices for labor items when floor level changes
    updateLaborPricesForFloor() {
        const floorLevel = parseInt(this.laborFloorLevelInput.value) || 1;
        Object.entries(this.laborExtraInputs).forEach(([resourceName, extraInput]) => {
            const priceInput = document.querySelector(`.price-input[data-resource='${resourceName}'][data-type='labor']`);
            if (priceInput) {
                const base = parseFloat(priceInput.dataset.base) || 0;
                const extra = parseFloat(extraInput.value) || 0;
                const newPrice = base + extra * (floorLevel - 1);
                priceInput.value = newPrice.toFixed(2);
                this.setCustomPrice(resourceName, newPrice);
            }
        });
        this.calculate();
    }

    saveCurrentItemToSummary() {
        // Get current selection and calculation
        const mainItem = this.mainItemSelect.value;
        const subItem = this.subItemSelect.value;
        const quantity = parseFloat(this.quantityInput.value) || 0;
        const total = parseFloat(this.totalCostElement.textContent) || 0;
        if (!mainItem || !subItem || quantity <= 0 || total <= 0) return;
        // Use the correct unit based on rules
        const unit = this.getCorrectUnit(mainItem, subItem);
        // Calculate unit price
        const unitPrice = total / quantity;
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
            <div class="summary-card-header" style="display: flex; align-items: center; cursor: pointer;">
                <span class="expand-icon" style="font-size: 1.5rem; margin-left: 12px; user-select: none;">&#9654;</span>
                <div class="item-title">${cardData.mainItem} - ${cardData.subItem}</div>
                <div class="item-details">الكمية: ${cardData.quantity} ${cardData.unit}</div>
                <div class="item-unit">تكلفة الوحدة: ${cardData.unitPrice.toFixed(2)} جنيه / ${cardData.unit}</div>
                <div class="item-sell-header">سعر البيع: <span class="sell-price-header">${cardData.unitPrice.toFixed(2)}</span> جنيه / ${cardData.unit}</div>
                <div class="item-total">الإجمالي: ${cardData.total.toFixed(2)} جنيه</div>
                <button class="delete-btn">حذف</button>
            </div>
            <div class="summary-card-body" style="display: none; margin-top: 10px;">
                <div class="card-row" style="display: flex; align-items: center; gap: 18px;">
                    <label style="min-width: 80px;">نسبة المخاطر (%)</label>
                    <input type="number" class="risk-input" min="0" step="0.01" style="width: 70px;">
                    <label style="min-width: 80px;">نسبة الضريبة (%)</label>
                    <input type="number" class="tax-input" min="0" step="0.01" style="width: 70px;">
                    <span class="item-unit">تكلفة الوحدة: <span class="unit-price-value">${cardData.unitPrice.toFixed(2)}</span> جنيه / ${cardData.unit}</span>
                    <span class="item-sell">سعر البيع: <span class="sell-price-value">${cardData.unitPrice.toFixed(2)}</span> جنيه / ${cardData.unit}</span>
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
            this.lastDeletedCardData = cardData;
            this.lastDeletedCardElement = card;
            card.remove();
            this.updateSummaryTotal();
            if (this.summaryUndoBtn) this.summaryUndoBtn.style.display = 'inline-block';
            // Update project items after delete
            this.saveProjectItemsFromDOM();
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
            const base = cardData.unitPrice;
            const sell = base * (1 + risk / 100) * (1 + tax / 100);
            sellPriceValue.textContent = sell.toFixed(2);
            sellPriceHeader.textContent = sell.toFixed(2);
            card.dataset.sellPrice = sell;
            this.updateSummaryTotal();
        };
        riskInput.addEventListener('input', updateSellPrice);
        taxInput.addEventListener('input', updateSellPrice);
        // Set initial sell price in dataset for summary total
        card.dataset.sellPrice = cardData.unitPrice;
        this.summaryCards.appendChild(card);
        this.updateSummaryTotal();
        this.updateResourcesSection();
        // Save all summary cards to project after add
        this.saveProjectItemsFromDOM();

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

    saveProjectItemsFromDOM() {
        if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
        const proj = this.projects[this.currentProjectId];
        proj.items = Array.from(this.summaryCards.querySelectorAll('.summary-card')).map(card => card.cardData);
        this.saveProjects();
    }

    undoLastDelete() {
        if (this.lastDeletedCardData && this.lastDeletedCardElement) {
            this.summaryCards.appendChild(this.lastDeletedCardElement);
            this.lastDeletedCardData = null;
            this.lastDeletedCardElement = null;
            if (this.summaryUndoBtn) this.summaryUndoBtn.style.display = 'none';
            this.updateSummaryTotal();
            this.updateResourcesSection();
        }
    }

    updateSummaryTotal() {
        // Sum all visible cards' selling prices
        let total = 0;
        this.summaryCards.querySelectorAll('.summary-card').forEach(card => {
            const sell = parseFloat(card.dataset.sellPrice) || 0;
            const quantityDiv = card.querySelector('.item-details');
            let quantity = 1;
            if (quantityDiv) {
                const match = quantityDiv.textContent.match(/الكمية:\s*([\d.]+)/);
                if (match) quantity = parseFloat(match[1]);
            }
            total += sell * quantity;
        });
        if (this.summaryTotal) {
            this.summaryTotal.textContent = `الإجمالي الكلي: ${total.toFixed(2)} جنيه`;
        }
    }

    // Determine the correct unit for a given main/sub item based on user rules
    getCorrectUnit(mainItem, subItem) {
        // Helper for substring match
        const contains = (str, arr) => arr.some(s => str.includes(s));
        // Special cases for بورسلين
        if (mainItem.includes('بورسلين')) {
            if (subItem.includes('وزر')) return 'مط';
            return 'م2';
        }
        // Special cases for جبسوم بورد
        if (mainItem.includes('جبسوم بورد')) {
            const mtSubs = ['ابيض طولي', 'اخضر طولي', 'بيوت ستاير', 'نور', 'ماجنتك تراك'];
            if (contains(subItem, mtSubs)) return 'مط';
            return 'م2';
        }
        // Special cases for تأسيس كهرباء
        if (mainItem.includes('تأسيس كهرباء')) {
            if (subItem.includes('صواعد')) return 'مط';
            return 'نقطة';
        }
        // Special cases for تأسيس سباكة
        if (mainItem.includes('تأسيس سباكة')) return 'نقطة';
        // Special cases for تأسيس تكييف
        if (mainItem.includes('تأسيس تكييف')) return 'مط';
        // Special cases for عزل
        if (mainItem.includes('عزل')) return 'م2';
        // All المباني, الهدم, النقاشة, المحارة, الرخام
        const m2Mains = ['المباني', 'الهدم', 'النقاشة', 'المحارة', 'الرخام'];
        if (contains(mainItem, m2Mains)) return 'م2';
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
        // Helper to render resource rows for a category
        const renderRows = (list) =>
            list.map(({ resource, data }) =>
                `<div class="resource-row">
                    <span class="resource-name">${resource}</span>
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
                                        <td class="usage-amount">${u.amount.toFixed(2)} ${u.unit}</td>
                                        <td class="usage-cost">${u.cost.toFixed(2)} جنيه</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`
            ).join('');
        // Render each panel
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
                items: []
            };
            this.saveProjects();
            this.currentProjectId = id;
            this.saveCurrentProjectId();
            this.renderProjectsList();
            this.loadProjectData();
            this.projectForm.reset();
        };
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
                <span>المشروع الحالي: <b>${proj.name}</b> (${proj.code}) - ${proj.type}, مساحة: ${proj.area}م², أدوار: ${proj.floor}</span>
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
                                <td>${isNaN(x.quantity) ? '0.00' : x.quantity.toFixed(2)}</td>
                                <td>${x.unit}</td>
                                <td>${isNaN(x.unitPrice) ? '0.00' : x.unitPrice.toFixed(2)} جنيه</td>
                                <td>${isNaN(x.totalCost) ? '0.00' : x.totalCost.toFixed(2)} جنيه</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight:bold;">
                            <td colspan="5">الإجمالي</td>
                            <td>${total.toFixed(2)} جنيه</td>
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

    exportProjectToPDF() {
        if (typeof pdfMake === 'undefined') {
            alert('pdfMake library not loaded.');
            return;
        }
        // Get current project
        const proj = this.projects[this.currentProjectId];
        if (!proj) {
            alert('لا يوجد مشروع محدد.');
            return;
        }
        // Project info
        const projectInfo = [
            { text: 'بيانات المشروع', style: 'header' },
            { ul: [
                `اسم المشروع: ${proj.name}`,
                `الكود: ${proj.code}`,
                `النوع: ${proj.type}`,
                `المساحة: ${proj.area} م²`,
                `عدد الأدوار: ${proj.floor}`
            ]}
        ];
        // Resource summary (إدارة الموارد)
        const resourcesSummary = this.getResourcesSummary();
        const resourcesTableBody = [
            ['المورد', 'الكمية', 'الوحدة', 'التكلفة']
        ];
        Object.entries(resourcesSummary).forEach(([resource, data]) => {
            resourcesTableBody.push([
                resource,
                data.totalAmount.toFixed(2),
                data.unit,
                data.totalCost.toFixed(2) + ' جنيه'
            ]);
        });
        // Items (البنود)
        const itemsTableBody = [
            ['البند', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي']
        ];
        (proj.items || []).forEach(card => {
            itemsTableBody.push([
                `${card.mainItem} - ${card.subItem}`,
                card.quantity,
                card.unit,
                card.unitPrice ? card.unitPrice.toFixed(2) + ' جنيه' : '',
                card.total ? card.total.toFixed(2) + ' جنيه' : ''
            ]);
        });
        // Build PDF definition
        const docDefinition = {
            content: [
                ...projectInfo,
                { text: 'إدارة الموارد', style: 'sectionHeader', margin: [0, 12, 0, 4] },
                {
                    table: {
                        headerRows: 1,
                        body: resourcesTableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 10]
                },
                { text: 'البنود', style: 'sectionHeader', margin: [0, 12, 0, 4] },
                {
                    table: {
                        headerRows: 1,
                        body: itemsTableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 10]
                }
            ],
            defaultStyle: { font: 'Roboto', alignment: 'right' },
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10], alignment: 'right' },
                sectionHeader: { fontSize: 15, bold: true, margin: [0, 10, 0, 5], color: '#7b1fa2', alignment: 'right' }
            },
            pageOrientation: 'portrait',
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30],
            rtl: true
        };
        // Use built-in Roboto font for now (Cairo not available in browser build)
        pdfMake.createPdf(docDefinition).download(`${proj.name || 'مشروع'}.pdf`);
    }

    exportProjectToExcel() {
        // Get current project
        const proj = this.projects[this.currentProjectId];
        if (!proj) {
            alert('لا يوجد مشروع محدد.');
            return;
        }
        // Project info as a sheet
        const projectSheet = [
            ['اسم المشروع', proj.name],
            ['الكود', proj.code],
            ['النوع', proj.type],
            ['المساحة', proj.area],
            ['عدد الأدوار', proj.floor]
        ];
        // Resources table
        const resourcesSummary = this.getResourcesSummary();
        const resourcesSheet = [
            ['المورد', 'الكمية', 'الوحدة', 'التكلفة']
        ];
        Object.entries(resourcesSummary).forEach(([resource, data]) => {
            resourcesSheet.push([
                resource,
                data.totalAmount.toFixed(2),
                data.unit,
                data.totalCost.toFixed(2) + ' جنيه'
            ]);
        });
        // Items table
        const itemsSheet = [
            ['البند', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي']
        ];
        (proj.items || []).forEach(card => {
            itemsSheet.push([
                `${card.mainItem} - ${card.subItem}`,
                card.quantity,
                card.unit,
                card.unitPrice ? card.unitPrice.toFixed(2) + ' جنيه' : '',
                card.total ? card.total.toFixed(2) + ' جنيه' : ''
            ]);
        });
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projectSheet), 'بيانات المشروع');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resourcesSheet), 'إدارة الموارد');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemsSheet), 'البنود');
        // Export
        XLSX.writeFile(wb, `${proj.name || 'مشروع'}.xlsx`);
    }
}

// Initialize the calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ConstructionCalculator();
}); 