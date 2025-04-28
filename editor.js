/**
 * Editor Mode for Biblioteca Digital
 * 
 * This script adds an Editor Mode to the Biblioteca Digital website,
 * allowing authorized users to edit content, add new items, and save changes.
 */

(function() {
    'use strict';

    // Main Editor object with public methods
    window.Editor = {
        enable: function() {
            EditorPrivate.enableEditorMode();
        },
        disable: function() {
            EditorPrivate.disableEditorMode();
        },
        addItem: function() {
            EditorPrivate.openAddItemModal();
        }
    };

    // Private implementation
    const EditorPrivate = {
        isEditorMode: false,
        editingItem: null,
        nextAvailableCode: 310, // Will be calculated dynamically

        init: function() {
            // Initialize the editor when DOM is fully loaded
            document.addEventListener('DOMContentLoaded', this.setup.bind(this));
            
            // Check if we need to restore from localStorage
            this.checkForSavedSnapshot();
        },

        setup: function() {
            // Update the R element to toggle editor mode
            this.setupEditorToggle();
            
            // Setup keyboard shortcut for resetting
            this.setupKeyboardShortcut();
            
            // Calculate the next available code
            this.calculateNextAvailableCode();
        },

        setupEditorToggle: function () {
            const r = document.getElementById('password-r');
            if (!r) return;

            const newR = r.cloneNode(true);
            r.parentNode.replaceChild(newR, r);
            newR.id = 'editor-toggle';

            newR.addEventListener('click', () => {
                /* already editing?  -> exit */
                if (EditorPrivate.isEditorMode) {
                    EditorPrivate.disableEditorMode();
                    return;
                }
                /* otherwise ask for the password and enter */
                const pwd = prompt('Digite a senha:');
                if (pwd === '24042003') {
                    EditorPrivate.enableEditorMode();
                } else {
                    alert('Senha incorreta');
                }
            });
        },

        setupKeyboardShortcut: function() {
            document.addEventListener('keydown', function(e) {
                // Ctrl + Shift + R to reset
                if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                    if (confirm('Tem certeza que deseja limpar todas as alterações salvas?')) {
                        localStorage.removeItem('bibliotecaSnapshot');
                        window.location.reload();
                    }
                }
            });
            
            /* Esc key leaves Editor Mode */
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && EditorPrivate.isEditorMode) {
                    EditorPrivate.disableEditorMode();
                }
            });
        },

        
        /** limpa artefactos do modo‑editor antes de injetar HTML salvo */
        

        calculateNextAvailableCode: function() {
            const documentCards = document.querySelectorAll('.document-card');
            let maxCode = 300; // Starting code
            
            documentCards.forEach(card => {
                const codeElement = card.querySelector('.document-code');
                if (codeElement) {
                    const code = parseInt(codeElement.textContent, 10);
                    if (!isNaN(code) && code > maxCode) {
                        maxCode = code;
                    }
                }
            });
            
            this.nextAvailableCode = maxCode + 1;
        },

        enableEditorMode: function() {
            // Set editor mode flag
            this.isEditorMode = true;
            
            // Add editing class to body
            document.body.classList.add('editing');
            
            // Add 'on' class to the R toggle
            const editorToggle = document.getElementById('editor-toggle');
            if (editorToggle) {
                editorToggle.classList.add('on');
            }
            
            // Make content editable
            this.makeContentEditable();
            
            // Add editor buttons
            this.addEditorButtons();
            
            // Add "Adicionar Arquivo" button
            this.addNewItemButton();
            
            // Setup historical photo change functionality
            this.setupHistoricalPhotoChange();
            
            // Setup double-click on code badges
            this.setupCodeBadgeEditing();
            
            console.log('Editor Mode enabled');
        },

        disableEditorMode: function() {
            // Reset editor mode flag
            this.isEditorMode = false;
            
            // Remove editing class from body
            document.body.classList.remove('editing');
            
            // Remove 'on' class from the R toggle
            const editorToggle = document.getElementById('editor-toggle');
            if (editorToggle) {
                editorToggle.classList.remove('on');
            }
            
            // Remove content editable
            this.removeContentEditable();
            
            // Remove editor buttons
            this.removeEditorButtons();
            
            console.log('Editor Mode disabled');
        },

        makeContentEditable: function() {
            // Make document cards editable
            const documentCards = document.querySelectorAll('.document-card');
            documentCards.forEach(card => {
                this.makeCardContentEditable(card);
            });
            
            // Make video cards editable
            const videoCards = document.querySelectorAll('.video-card');
            videoCards.forEach(card => {
                this.makeCardContentEditable(card);
            });
            
            // Make intro section editable
            const introSection = document.querySelector('#intro');
            if (introSection) {
                const paragraphs = introSection.querySelectorAll('p');
                paragraphs.forEach(p => {
                    this.makeElementEditable(p);
                });
            }
            
            // Make historical photo caption editable
            const photoCaption = document.querySelector('.historical-photo-caption');
            if (photoCaption) {
                this.makeElementEditable(photoCaption);
            }
        },

        makeCardContentEditable: function(card) {
            // Make title editable
            const title = card.querySelector('h3');
            if (title) this.makeElementEditable(title);
            
            // Make author editable
            const author = card.querySelector('.document-author');
            if (author) this.makeElementEditable(author);
            
            // Make year editable
            const year = card.querySelector('.document-year');
            if (year) this.makeElementEditable(year);
            
            // Make synopsis/description editable
            const synopsis = card.querySelector('p');
            if (synopsis) this.makeElementEditable(synopsis);
        },

        makeElementEditable: function(element) {
            element.contentEditable = true;
            element.dataset.originalContent = element.innerHTML;
            
            // Add event listeners for saving changes
            element.addEventListener('blur', this.handleElementBlur.bind(this));
            element.addEventListener('keydown', this.handleElementKeydown.bind(this));
        },

        handleElementBlur: function(event) {
            // Save changes when element loses focus
            const element = event.target;
            console.log('Content edited:', element.innerHTML);
        },

        handleElementKeydown: function(event) {
            // Save changes when Enter is pressed (except with Shift for new lines)
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.target.blur();
            }
        },

        removeContentEditable: function() {
            // Remove contentEditable from all elements
            const editableElements = document.querySelectorAll('[contenteditable="true"]');
            editableElements.forEach(element => {
                element.contentEditable = false;
                delete element.dataset.originalContent;
            });
            
            // Remove event listeners (by cloning and replacing elements)
            editableElements.forEach(element => {
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
            });
        },

        addEditorButtons: function() {
            // Create footer for editor buttons
            const footer = document.createElement('div');
            footer.className = 'editor-footer';
            footer.style.position = 'fixed';
            footer.style.bottom = '0';
            footer.style.left = '0';
            footer.style.width = '100%';
            footer.style.backgroundColor = 'var(--primary-color)';
            footer.style.color = 'white';
            footer.style.padding = '15px 0';
            footer.style.textAlign = 'center';
            footer.style.zIndex = '999';
            footer.style.display = 'flex';
            footer.style.flexDirection = 'column';
            footer.style.alignItems = 'center';
            
            // Add copyright text
            const copyrightText = document.createElement('div');
            copyrightText.innerHTML = 'Biblioteca Digital Reinaldo Duarte Castanheira &copy; 2025';
            copyrightText.style.marginBottom = '5px';
            footer.appendChild(copyrightText);
            
            // Add tagline
            const tagline = document.createElement('div');
            tagline.innerHTML = 'Preservando a memória literária de nossa cidade';
            tagline.style.fontSize = '0.9em';
            tagline.style.marginBottom = '10px';
            footer.appendChild(tagline);
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.position = 'absolute';
            buttonsContainer.style.right = '20px';
            buttonsContainer.style.top = '50%';
            buttonsContainer.style.transform = 'translateY(-50%)';
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '10px';
            
            // Create Save button
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save site';
            saveButton.className = 'editor-save-button';
            saveButton.style.backgroundColor = 'var(--gold-color)';
            saveButton.style.color = 'var(--primary-color)';
            saveButton.style.border = 'none';
            saveButton.style.padding = '8px 15px';
            saveButton.style.borderRadius = '5px';
            saveButton.style.cursor = 'pointer';
            saveButton.style.fontFamily = "'Playfair Display', serif";
            saveButton.style.fontWeight = 'bold';
            saveButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            saveButton.addEventListener('click', () => {
                this.saveCurrentState();
                this.disableEditorMode(); // Exit editor mode after saving
            });
            
            // Create Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel editing';
            cancelButton.className = 'editor-cancel-button';
            cancelButton.style.backgroundColor = 'transparent';
            cancelButton.style.color = 'var(--gold-color)';
            cancelButton.style.border = '1px solid var(--gold-color)';
            cancelButton.style.padding = '8px 15px';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontFamily = "'Playfair Display', serif";
            cancelButton.style.fontWeight = 'bold';
            cancelButton.addEventListener('click', () => {
                this.disableEditorMode(); // Exit editor mode when canceling
                window.location.reload();
            });
            
            // Add buttons to container
            buttonsContainer.appendChild(saveButton);
            buttonsContainer.appendChild(cancelButton);
            
            // Add container to footer
            footer.appendChild(buttonsContainer);
            
            // Add footer to body
            document.body.appendChild(footer);
        },

        removeEditorButtons: function() {
            // Remove editor footer
            const footer = document.querySelector('.editor-footer');
            if (footer) {
                footer.remove();
            }
            
            // Remove add item button
            const addButton = document.querySelector('.add-item-button');
            if (addButton) {
                addButton.remove();
            }
        },

        addNewItemButton: function() {
            // Create a yellow plus button in the lower center
            const addButton = document.createElement('div');
            addButton.className = 'add-item-button';
            addButton.innerHTML = '&#43;'; // Plus sign
            addButton.style.position = 'fixed';
            addButton.style.bottom = '80px'; // Position above the footer
            addButton.style.left = '50%';
            addButton.style.transform = 'translateX(-50%)';
            addButton.style.width = '40px';
            addButton.style.height = '40px';
            addButton.style.borderRadius = '50%';
            addButton.style.backgroundColor = 'var(--gold-color)';
            addButton.style.color = 'var(--primary-color)';
            addButton.style.display = 'flex';
            addButton.style.justifyContent = 'center';
            addButton.style.alignItems = 'center';
            addButton.style.fontSize = '24px';
            addButton.style.fontWeight = 'bold';
            addButton.style.cursor = 'pointer';
            addButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            addButton.style.zIndex = '1000';
            addButton.style.transition = 'transform 0.2s ease';
            
            // Add hover effect
            addButton.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(-50%) scale(1.1)';
            });
            
            addButton.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(-50%) scale(1)';
            });
            
            // Add click event to open the modal
            addButton.addEventListener('click', this.openAddItemModal.bind(this));
            
            // Add the button to the body
            document.body.appendChild(addButton);
        },

        openAddItemModal: function(existingItem = null) {
            // Set editing item if provided
            this.editingItem = existingItem;
            
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            modalOverlay.style.position = 'fixed';
            modalOverlay.style.top = '0';
            modalOverlay.style.left = '0';
            modalOverlay.style.width = '100%';
            modalOverlay.style.height = '100%';
            modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            modalOverlay.style.display = 'flex';
            modalOverlay.style.justifyContent = 'center';
            modalOverlay.style.alignItems = 'center';
            modalOverlay.style.zIndex = '2000';
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.padding = '30px';
            modalContent.style.borderRadius = '10px';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.maxHeight = '90vh';
            modalContent.style.overflowY = 'auto';
            modalContent.style.position = 'relative';
            
            // Create modal title
            const modalTitle = document.createElement('h2');
            modalTitle.textContent = existingItem ? 'Editar Item' : 'Adicionar Novo Item';
            modalTitle.style.marginBottom = '20px';
            modalTitle.style.color = 'var(--primary-color)';
            modalContent.appendChild(modalTitle);
            
            // Create form
            const form = document.createElement('form');
            form.id = 'add-item-form';
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '15px';
            
            // Gênero dropdown
            const genreField = this.createFormField('Gênero', 'select', 'genre', true);
            const genreOptions = ['livro', 'conto', 'poema', 'documento', 'mídia'];
            const genreSelect = genreField.querySelector('select');
            
            genreOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option;
                optElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
                genreSelect.appendChild(optElement);
            });
            
            form.appendChild(genreField);
            
            // Título
            const titleField = this.createFormField('Título', 'text', 'title', true);
            form.appendChild(titleField);
            
            // Autor
            const authorField = this.createFormField('Autor', 'text', 'author', true);
            form.appendChild(authorField);
            
            // Ano
            const yearField = this.createFormField('Ano', 'number', 'year', true);
            const yearInput = yearField.querySelector('input');
            yearInput.min = '1000';
            yearInput.max = '9999';
            yearInput.pattern = '[0-9]{4}';
            form.appendChild(yearField);
            
            // Código
            const codeField = this.createFormField('Código', 'number', 'code', true);
            const codeInput = codeField.querySelector('input');
            codeInput.min = '100';
            codeInput.max = '999';
            codeInput.pattern = '[0-9]{3}';
            codeInput.value = this.nextAvailableCode;
            form.appendChild(codeField);
            
            // Link do Arquivo
            const linkField = this.createFormField('Link do Arquivo', 'text', 'link', true);
            form.appendChild(linkField);
            
            // Sinopse
            const synopsisField = this.createFormField('Sinopse', 'textarea', 'synopsis', true);
            const synopsisTextarea = synopsisField.querySelector('textarea');
            synopsisTextarea.rows = 5;
            form.appendChild(synopsisField);
            
            // Fill form with existing data if editing
            if (existingItem) {
                this.fillFormWithExistingData(form, existingItem);
            }
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.justifyContent = 'space-between';
            buttonsContainer.style.marginTop = '20px';
            
            // Create Save button
            const saveButton = document.createElement('button');
            saveButton.type = 'button';
            saveButton.textContent = 'Salvar';
            saveButton.style.backgroundColor = 'var(--gold-color)';
            saveButton.style.color = 'var(--primary-color)';
            saveButton.style.border = 'none';
            saveButton.style.padding = '10px 20px';
            saveButton.style.borderRadius = '5px';
            saveButton.style.cursor = 'pointer';
            saveButton.style.fontWeight = 'bold';
            saveButton.addEventListener('click', () => {
                if (this.validateForm(form)) {
                    if (existingItem) {
                        this.updateExistingItem(form, existingItem);
                    } else {
                        this.createNewItem(form);
                    }
                    document.body.removeChild(modalOverlay);
                }
            });
            
            // Create Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancelar';
            cancelButton.style.backgroundColor = '#ccc';
            cancelButton.style.color = '#333';
            cancelButton.style.border = 'none';
            cancelButton.style.padding = '10px 20px';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(modalOverlay);
            });
            
            // Add buttons to container
            buttonsContainer.appendChild(cancelButton);
            
            // Add Delete button if editing
            if (existingItem) {
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.textContent = 'Excluir';
                deleteButton.style.backgroundColor = '#d9534f';
                deleteButton.style.color = 'white';
                deleteButton.style.border = 'none';
                deleteButton.style.padding = '10px 20px';
                deleteButton.style.borderRadius = '5px';
                deleteButton.style.cursor = 'pointer';
                deleteButton.addEventListener('click', () => {
                    if (confirm('Tem certeza que deseja excluir este item?')) {
                        this.deleteItem(existingItem);
                        document.body.removeChild(modalOverlay);
                    }
                });
                buttonsContainer.appendChild(deleteButton);
            }
            
            buttonsContainer.appendChild(saveButton);
            
            // Add form and buttons to modal
            form.appendChild(buttonsContainer);
            modalContent.appendChild(form);
            
            // Add modal to page
            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);
        },

        createFormField: function(label, type, id, required) {
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'form-field';
            fieldContainer.style.marginBottom = '15px';
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = id;
            labelElement.textContent = label + (required ? ' *' : '');
            labelElement.style.display = 'block';
            labelElement.style.marginBottom = '5px';
            labelElement.style.fontWeight = 'bold';
            fieldContainer.appendChild(labelElement);
            
            let inputElement;
            
            if (type === 'textarea') {
                inputElement = document.createElement('textarea');
                inputElement.style.width = '100%';
                inputElement.style.padding = '8px';
                inputElement.style.borderRadius = '4px';
                inputElement.style.border = '1px solid #ccc';
                inputElement.style.fontFamily = 'inherit';
            } else if (type === 'select') {
                inputElement = document.createElement('select');
                inputElement.style.width = '100%';
                inputElement.style.padding = '8px';
                inputElement.style.borderRadius = '4px';
                inputElement.style.border = '1px solid #ccc';
            } else {
                inputElement = document.createElement('input');
                inputElement.type = type;
                inputElement.style.width = '100%';
                inputElement.style.padding = '8px';
                inputElement.style.borderRadius = '4px';
                inputElement.style.border = '1px solid #ccc';
            }
            
            inputElement.id = id;
            inputElement.name = id;
            if (required) {
                inputElement.required = true;
                inputElement.dataset.required = 'true';
            }
            
            fieldContainer.appendChild(inputElement);
            
            // Add error message container
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.style.color = 'red';
            errorMessage.style.fontSize = '0.8em';
            errorMessage.style.marginTop = '5px';
            errorMessage.style.display = 'none';
            fieldContainer.appendChild(errorMessage);
            
            return fieldContainer;
        },

        fillFormWithExistingData: function(form, item) {
            // Get data from the item
            const title = item.querySelector('h3').textContent;
            const author = item.querySelector('.document-author').textContent;
            const year = item.querySelector('.document-year').textContent;
            const code = item.querySelector('.document-code').textContent;
            const synopsis = item.querySelector('p').textContent;
            const type = item.querySelector('.document-type').textContent.toLowerCase();
            
            // Get link from the read/view button
            const linkElement = item.querySelector('.read-button') || item.querySelector('a');
            const link = linkElement ? linkElement.getAttribute('href') : '';
            
            // Fill the form fields
            form.querySelector('#genre').value = type;
            form.querySelector('#title').value = title;
            form.querySelector('#author').value = author;
            form.querySelector('#year').value = year;
            form.querySelector('#code').value = code;
            form.querySelector('#link').value = link;
            form.querySelector('#synopsis').value = synopsis;
        },

        validateForm: function(form) {
            let isValid = true;
            const requiredFields = form.querySelectorAll('[data-required="true"]');
            
            // Reset all error messages
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => {
                msg.style.display = 'none';
                msg.textContent = '';
            });
            
            // Reset all field borders
            const formFields = form.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                field.style.border = '1px solid #ccc';
            });
            
            // Check required fields
            requiredFields.forEach(field => {
                const errorMessage = field.parentNode.querySelector('.error-message');
                
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.border = '1px solid red';
                    errorMessage.textContent = 'Este campo é obrigatório';
                    errorMessage.style.display = 'block';
                }
            });
            
            // Validate year (4 digits)
            const yearField = form.querySelector('#year');
            if (yearField && yearField.value) {
                const yearValue = yearField.value.trim();
                const yearPattern = /^\d{4}$/;
                
                if (!yearPattern.test(yearValue)) {
                    isValid = false;
                    yearField.style.border = '1px solid red';
                    const errorMessage = yearField.parentNode.querySelector('.error-message');
                    errorMessage.textContent = 'O ano deve ter 4 dígitos';
                    errorMessage.style.display = 'block';
                }
            }
            
            // Validate code (3 digits)
            const codeField = form.querySelector('#code');
            if (codeField && codeField.value) {
                const codeValue = codeField.value.trim();
                const codePattern = /^\d{3}$/;
                
                if (!codePattern.test(codeValue)) {
                    isValid = false;
                    codeField.style.border = '1px solid red';
                    const errorMessage = codeField.parentNode.querySelector('.error-message');
                    errorMessage.textContent = 'O código deve ter 3 dígitos';
                    errorMessage.style.display = 'block';
                }
            }
            
            return isValid;
        },

        createNewItem: function(form) {
            // Get form values
            const genre = form.querySelector('#genre').value;
            const title = form.querySelector('#title').value;
            const author = form.querySelector('#author').value;
            const year = form.querySelector('#year').value;
            const code = form.querySelector('#code').value;
            const link = form.querySelector('#link').value;
            const synopsis = form.querySelector('#synopsis').value;
            
            // Create new card
            const newCard = document.createElement('div');
            newCard.className = 'document-card';
            newCard.style.animation = 'fadeIn 0.5s ease-in-out';
            
            // Create card content based on existing card structure
            newCard.innerHTML = `
                <div class="document-code">${code}</div>
                <h3>${title}</h3>
                <div class="document-author">${author}</div>
                <div class="document-year">${year}</div>
                <p>${synopsis}</p>
                <div class="document-footer">
                    <span class="document-type">${genre}</span>
                    <a href="${link}" class="read-button">${genre === 'mídia' ? 'Ver' : 'Ler'}</a>
                </div>
            `;
            
            // Special handling for YouTube videos
            if (genre === 'mídia' && link.includes('youtube.com/watch?v=')) {
                // Convert to video card if needed
                this.convertToVideoCard(newCard, link);
            }
            
            // Find the hidden documents container or create it if it doesn't exist
            let hiddenDocuments = document.getElementById('hidden-documents');
            if (!hiddenDocuments) {
                hiddenDocuments = document.createElement('div');
                hiddenDocuments.id = 'hidden-documents';
                hiddenDocuments.className = 'documents-grid';
                hiddenDocuments.style.display = 'none';
                
                const visibleDocuments = document.getElementById('visible-documents');
                if (visibleDocuments) {
                    visibleDocuments.parentNode.insertBefore(hiddenDocuments, visibleDocuments.nextSibling);
                } else {
                    const acervoSection = document.getElementById('acervo');
                    if (acervoSection) {
                        acervoSection.appendChild(hiddenDocuments);
                    }
                }
            }
            
            // Add the new card to the hidden documents
            hiddenDocuments.appendChild(newCard);
            
            // Make the new card editable
            this.makeCardContentEditable(newCard);
            
            // Setup code badge double-click for editing
            this.setupCodeBadgeEditing(newCard);
            
            // Update next available code
            this.nextAvailableCode = Math.max(this.nextAvailableCode, parseInt(code, 10) + 1);
            
            // Recalculate everything that depends on the total number of obras
            this.recalculateDependencies();
            
            // Scroll to the new card and flash it
            this.scrollToAndFlashCard(newCard);
        },

        updateExistingItem: function(form, item) {
            // Get form values
            const genre = form.querySelector('#genre').value;
            const title = form.querySelector('#title').value;
            const author = form.querySelector('#author').value;
            const year = form.querySelector('#year').value;
            const code = form.querySelector('#code').value;
            const link = form.querySelector('#link').value;
            const synopsis = form.querySelector('#synopsis').value;
            
            // Update the item
            item.querySelector('.document-code').textContent = code;
            item.querySelector('h3').textContent = title;
            item.querySelector('.document-author').textContent = author;
            item.querySelector('.document-year').textContent = year;
            item.querySelector('p').textContent = synopsis;
            item.querySelector('.document-type').textContent = genre;
            
            // Update the link
            const linkElement = item.querySelector('.read-button') || item.querySelector('a');
            if (linkElement) {
                linkElement.href = link;
                linkElement.textContent = genre === 'mídia' ? 'Ver' : 'Ler';
            }
            
            // Special handling for YouTube videos
            if (genre === 'mídia' && link.includes('youtube.com/watch?v=')) {
                // Convert to video card if needed
                this.convertToVideoCard(item, link);
            }
            
            // Flash the updated card
            this.scrollToAndFlashCard(item);
        },

        deleteItem: function(item) {
            // Remove the item from the DOM
            item.remove();
            
            // Recalculate dependencies
            this.recalculateDependencies();
        },

        convertToVideoCard: function(card, link) {
            // Implementation for converting to video card if needed
            // This would depend on the existing video card structure
            console.log('Converting to video card:', link);
        },

        recalculateDependencies: function() {
            // Update the stat badge count
            this.updateStatBadge();
            
            // Update search index (if implemented)
            // this.updateSearchIndex();
            
            // Update timeline (if needed)
            // this.updateTimeline();
        },

        updateStatBadge: function() {
            // Count all document and video cards
            const documentCards = document.querySelectorAll('.document-card').length;
            const videoCards = document.querySelectorAll('.video-card').length;
            const totalItems = documentCards + videoCards;
            
            // Update the stat badge
            const statBadge = document.querySelector('.stat-badge span');
            if (statBadge) {
                statBadge.textContent = totalItems + '+';
            }
        },

        scrollToAndFlashCard: function(card) {
            // Scroll to the card
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add pulse animation
            card.style.animation = 'pulse 1s 3';
            
            // Define pulse animation if it doesn't exist
            if (!document.querySelector('#pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212, 180, 95, 0.7); }
                        50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(212, 180, 95, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212, 180, 95, 0); }
                    }
                `;
                document.head.appendChild(style);
            }
        },

        setupHistoricalPhotoChange: function() {
            // Find the historical photo
            const photoContainer = document.querySelector('.historical-photo');
            if (!photoContainer) return;
            
            const photoImg = photoContainer.querySelector('img');
            if (!photoImg) return;
            
            // Create overlay button container
            const overlayButton = document.createElement('div');
            overlayButton.className = 'photo-change-button';
            overlayButton.innerHTML = '📷 Trocar';
            overlayButton.style.position = 'absolute';
            overlayButton.style.top = '10px';
            overlayButton.style.right = '10px';
            overlayButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlayButton.style.color = 'white';
            overlayButton.style.padding = '5px 10px';
            overlayButton.style.borderRadius = '4px';
            overlayButton.style.cursor = 'pointer';
            overlayButton.style.opacity = '0';
            overlayButton.style.transition = 'opacity 0.3s ease';
            
            // Position the container relatively for absolute positioning of the button
            photoContainer.style.position = 'relative';
            
            // Show button on hover
            photoContainer.addEventListener('mouseenter', function() {
                overlayButton.style.opacity = '1';
            });
            
            photoContainer.addEventListener('mouseleave', function() {
                overlayButton.style.opacity = '0';
            });
            
            // Handle click to change photo
            overlayButton.addEventListener('click', function() {
                // Create file input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // Trigger file selection
                fileInput.click();
                
                // Handle file selection
                fileInput.addEventListener('change', function() {
                    if (fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];
                        
                        // Create object URL for preview
                        const objectURL = URL.createObjectURL(file);
                        photoImg.src = objectURL;
                        
                        // Save to localStorage
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            localStorage.setItem('historicalPhoto', e.target.result);
                        };
                        reader.readAsDataURL(file);
                    }
                    
                    // Remove the file input
                    document.body.removeChild(fileInput);
                });
            });
            
            // Add button to container
            photoContainer.appendChild(overlayButton);
            
            // Check if there's a saved photo
            const savedPhoto = localStorage.getItem('historicalPhoto');
            if (savedPhoto) {
                photoImg.src = savedPhoto;
            }
        },

        setupCodeBadgeEditing: function(container = document) {
            // Find all code badges in document cards
            const codeBadges = container.querySelectorAll('.document-card .document-code, .video-card .document-code');
            
            codeBadges.forEach(badge => {
                // Remove existing event listeners
                const newBadge = badge.cloneNode(true);
                badge.parentNode.replaceChild(newBadge, badge);
                
                // Add double-click event
                newBadge.addEventListener('dblclick', event => {
                    if (!this.isEditorMode) return;
                    
                    const card = newBadge.closest('.document-card') || newBadge.closest('.video-card');
                    if (card) {
                        this.openAddItemModal(card);
                    }
                });
            });
        },

        saveCurrentState() {
            const clone = document.body.cloneNode(true);

            clone.classList.remove('editing');
            clone.querySelectorAll('.editor-footer, .add-item-button').forEach(e => e.remove());
            clone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));

            localStorage.setItem('bibliotecaSnapshot', clone.innerHTML);
            alert('Site salvo com sucesso!');
        }
    };

    // Add editor styles
    const addEditorStyles = function() {
        const style = document.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            body.editing [contenteditable="true"] {
                outline: 2px dashed var(--gold-color);
                padding: 2px;
                min-height: 1em;
            }
            
            body.editing [contenteditable="true"]:hover {
                background-color: rgba(212, 180, 95, 0.1);
            }
            
            body.editing [contenteditable="true"]:focus {
                outline: 2px solid var(--gold-color);
                background-color: rgba(212, 180, 95, 0.2);
            }
            
            #editor-toggle.on .r-letter {
                color: #ffcc00;
                text-shadow: 0 0 10px rgba(255, 204, 0, 0.7);
            }
            
            .document-code {
                cursor: default;
            }
            
            body.editing .document-code {
                cursor: pointer;
            }
            
            body.editing .document-code:hover {
                background-color: var(--gold-color);
                color: var(--primary-color);
            }
        `;
        document.head.appendChild(style);
    };

    // Initialize editor
    addEditorStyles();
    EditorPrivate.init();
})();
