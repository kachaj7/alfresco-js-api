/*!
 * @license
 * Copyright 2016 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { AlfrescoApiService, AppConfigService } from '@alfresco/adf-core';
import { QueryBody, RequestFacetFields, RequestFacetField } from 'alfresco-js-api';
import { SearchCategory } from './search-category.interface';
import { FilterQuery } from './filter-query.interface';
import { SearchRange } from './search-range.interface';
import { SearchConfiguration } from './search-configuration.interface';
import { FacetQuery } from './facet-query.interface';

@Injectable()
export class SearchQueryBuilderService {

    updated: Subject<QueryBody> = new Subject();
    executed: Subject<any> = new Subject();

    categories: Array<SearchCategory> = [];
    queryFragments: { [id: string]: string } = {};
    filterQueries: FilterQuery[] = [];
    ranges: { [id: string]: SearchRange } = {};
    paging: { maxItems?: number; skipCount?: number } = null;

    config: SearchConfiguration;

    constructor(appConfig: AppConfigService,  private alfrescoApiService: AlfrescoApiService) {
        this.config = appConfig.get<SearchConfiguration>('search');
        if (!this.config) {
            throw new Error('Search configuration not found.');
        }

        if (this.config.categories) {
            this.categories = this.config.categories.filter(f => f.enabled);
        }

        this.filterQueries = this.config.filterQueries || [];
    }

    addFilterQuery(query: string): void {
        if (query) {
            const existing = this.filterQueries.find(q => q.query === query);
            if (!existing) {
                this.filterQueries.push({ query: query });
            }
        }
    }

    removeFilterQuery(query: string): void {
        if (query) {
            this.filterQueries = this.filterQueries.filter(f => f.query !== query);
        }
    }

    getFacetQuery(label: string): FacetQuery {
        if (label) {
            const queries = this.config.facetQueries.queries || [];
            return queries.find(q => q.label === label);
        }
        return null;
    }

    update(): void {
        const query = this.buildQuery();
        this.updated.next(query);
    }

    async execute() {
        const query = this.buildQuery();
        const data = await this.alfrescoApiService.searchApi.search(query);
        this.executed.next(data);
    }

    buildQuery(): QueryBody {
        let query = '';

        this.categories.forEach(facet => {
            const customQuery = this.queryFragments[facet.id];
            if (customQuery) {
                if (query.length > 0) {
                    query += ' AND ';
                }
                query += `(${customQuery})`;
            }
        });

        const include = this.config.include || [];
        if (include.length === 0) {
            include.push('path', 'allowableOperations');
        }

        if (query) {

            const result: QueryBody = {
                query: {
                    query: query,
                    language: 'afts'
                },
                include: include,
                paging: this.paging,
                fields: this.config.fields,
                filterQueries: this.filterQueries,
                facetQueries: this.facetQueries,
                facetFields: this.facetFields
            };

            return result;
        }

        return null;
    }

    private get facetQueries(): FacetQuery[] {
        const config = this.config.facetQueries;

        if (config && config.queries && config.queries.length > 0) {
            return config.queries.map(query => {
                return <FacetQuery> { ...query };
            });
        }

        return null;
    }

    private get facetFields(): RequestFacetFields {
        const facetFields = this.config.facetFields;

        if (facetFields && facetFields.length > 0) {
            return {
                facets: facetFields.map(facet => <RequestFacetField> {
                    field: facet.field,
                    mincount: facet.mincount,
                    label: facet.label,
                    limit: facet.limit,
                    offset: facet.offset,
                    prefix: facet.prefix
                })
            };
        }

        return null;
    }
}